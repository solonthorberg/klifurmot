from django.utils import timezone
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db.models import F
from collections import defaultdict

from .models import Climb, ClimberRoundScore, RoundResult
from .utils import broadcast_score_update
from competitions.models import CompetitionRound
from decimal import Decimal


@receiver(post_save, sender=Climb)
def update_round_score_on_climb_save(sender, instance, **kwargs):
    climber = instance.climber
    round_obj = instance.boulder.round

    climbs = Climb.objects.filter(
        climber=climber,
        boulder__round=round_obj,
        deleted=False
    )

    total_tops = sum(1 for c in climbs if c.top_reached)
    total_zones = sum(1 for c in climbs if c.zone_reached)
    attempts_top = sum(c.attempts_top for c in climbs if c.top_reached)
    attempts_zone = sum(c.attempts_zone for c in climbs if c.zone_reached)

    zone_score = 0
    top_score = 0

    if total_tops > 0:
        # Climber reached top — ignore zone deductions
        top_score = total_tops * (10 + 15 - 0.1 * (attempts_top - total_tops))
    elif total_zones > 0:
        # Climber reached zone only
        zone_score = total_zones * (10 - 0.1 * (attempts_zone - total_zones))

    total_score = round(zone_score + top_score, 1)


    ClimberRoundScore.objects.update_or_create(
        round=round_obj,
        climber=climber,
        defaults={
            'total_score': total_score,
            'tops': total_tops,
            'zones': total_zones,
            'attempts_tops': attempts_top,
            'attempts_zones': attempts_zone,
        }
    )


@receiver(post_save, sender=ClimberRoundScore)
def update_round_results_on_score_save(sender, instance, **kwargs):
    round_obj = instance.round

    scores = list(
        ClimberRoundScore.objects
        .filter(round=round_obj)
        .select_related('climber')
        .order_by('-total_score')
    )

    grouped = defaultdict(list)
    for score in scores:
        grouped[score.total_score].append(score)

    def tiebreak_group(score_group, current_round):
        if len(score_group) <= 1:
            return score_group

        all_rounds = list(
            CompetitionRound.objects
            .filter(competition_category=current_round.competition_category)
            .order_by('round_order')
        )

        try:
            current_index = all_rounds.index(current_round)
            previous_round = all_rounds[current_index - 1]
        except (ValueError, IndexError):
            return score_group

        prev_results = RoundResult.objects.filter(
            round=previous_round,
            climber__in=[s.climber for s in score_group]
        ).select_related('climber')

        prev_rank_map = {res.climber.id: res.rank for res in prev_results}

        score_group.sort(key=lambda s: prev_rank_map.get(s.climber.id, 9999))

        new_grouped = defaultdict(list)
        for s in score_group:
            rank = prev_rank_map.get(s.climber.id)
            new_grouped[rank].append(s)

        resolved = []
        for sub_group in sorted(new_grouped.items()):
            resolved.extend(tiebreak_group(sub_group[1], previous_round))

        return resolved

    final_ranked = []
    for score_group in sorted(grouped.items(), reverse=True):
        resolved = tiebreak_group(score_group[1], round_obj)
        final_ranked.extend(resolved)

    actual_rank = 1
    skip_count = 0
    previous_score = None
    previous_rank = None

    for score in final_ranked:
        if previous_score is not None and score.total_score == previous_score:
            assigned_rank = previous_rank
            skip_count += 1
        else:
            assigned_rank = actual_rank
            actual_rank += 1 + skip_count
            skip_count = 0

        previous_score = score.total_score
        previous_rank = assigned_rank

        RoundResult.objects.update_or_create(
            round=round_obj,
            climber=score.climber,
            defaults={
                'rank': assigned_rank,
                'last_modified_at': timezone.now(),
            }
        )

    broadcast_score_update(round_obj.competition_category.competition_id)
