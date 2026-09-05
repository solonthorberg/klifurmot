from typing import List, Optional

from competitions.models import CompetitionRound

from scoring.models import Climb, ClimberRoundScore, RoundResult

from . import types


def climb_list(
    round_id: int, climber_id: Optional[int] = None
) -> list[dict[str, List[types.Climb]]]:
    queryset = Climb.objects.select_related(
        "climber__user_account",
        "route",
    ).filter(
        route__round_id=round_id,
        deleted=False,
    )

    if climber_id:
        queryset = queryset.filter(climber_id=climber_id)

    result = []

    for climb in queryset:
        climber = climb.climber

        if climber.is_simple_athlete:
            climber_name = climber.simple_name
        else:
            climber_name = (
                climber.user_account.full_name if climber.user_account else None
            )

        result.append(
            types.Climb(
                id=climb.pk,
                climber_id=climber.pk,
                climber_name=climber_name,
                route_id=climb.route.pk,
                route_number=climb.route.route_number,
                attempts_top=climb.attempts_top,
                attempts_zone=climb.attempts_zone,
                top_reached=climb.top_reached,
                zone_reached=climb.zone_reached,
            )
        )

    return result


def climb_get(climb_id: int) -> types.Climb:
    try:
        climb = Climb.objects.select_related(
            "climber__user_account",
            "route",
        ).get(id=climb_id, deleted=False)
    except Climb.DoesNotExist:
        raise ValueError(f"Climb with id {climb_id} not found")

    climber = climb.climber

    if climber.is_simple_athlete:
        climber_name = climber.simple_name
    else:
        climber_name = climber.user_account.full_name if climber.user_account else None

    return types.Climb(
        id=climb.pk,
        climber_id=climber.pk,
        climber_name=climber_name,
        route_id=climb.route.pk,
        route_number=climb.route.route_number,
        attempts_top=climb.attempts_top,
        attempts_zone=climb.attempts_zone,
        top_reached=climb.top_reached,
        zone_reached=climb.zone_reached,
    )


def boulder_scores_list(round_id: int) -> list[types.BoulderScore]:
    try:
        round_obj = CompetitionRound.objects.get(id=round_id, deleted=False)
    except CompetitionRound.DoesNotExist:
        return []

    ranked = rank_climbers_in_round(round_obj)

    result = []
    for climber_id, score, rank in ranked:
        climber = score.climber
        climber_name = (
            climber.simple_name
            if climber.is_simple_athlete
            else (climber.user_account.full_name if climber.user_account else None)
        )
        result.append(
            types.BoulderScore(
                rank=rank,
                climber_id=climber_id,
                climber_name=climber_name,
                tops=score.tops,
                zones=score.zones,
                attempts_tops=score.attempts_tops,
                attempts_zones=score.attempts_zones,
                total_score=float(score.total_score),
            )
        )

    return result


def rank_climbers_in_round(round_obj) -> List[types.RankedClimberResult]:
    """
    World Climbing boulder ranking (Annex C 7.1):
      1. total_score descending
      2. countback to previous round rank
      3. attempts_tops ascending
      4. attempts_zones ascending

    Returns list of (climber_id, score, rank) sorted by rank ascending.
    Climbers with no ClimberRoundScore (didn't attempt any boulder) are excluded.
    """
    scores = list(
        ClimberRoundScore.objects.filter(round=round_obj, deleted=False).select_related(
            "climber"
        )
    )
    if not scores:
        return []

    all_rounds = list(
        CompetitionRound.objects.filter(
            competition_category=round_obj.competition_category,
            deleted=False,
        ).order_by("round_order")
    )
    try:
        idx = all_rounds.index(round_obj)
        previous_round = all_rounds[idx - 1] if idx > 0 else None
    except ValueError:
        previous_round = None

    prev_rank_map = {}
    if previous_round:
        prev_rank_map = {
            r.climber.pk: r.rank
            for r in RoundResult.objects.filter(round=previous_round, deleted=False)
            if r.rank is not None
        }

    def rank_key(s):
        return (
            -float(s.total_score),
            prev_rank_map.get(s.climber_id, 9999),
            s.attempts_tops,
            s.attempts_zones,
        )

    scores.sort(key=rank_key)

    ranked = []
    previous_key = None
    previous_rank = 0
    for position, score in enumerate(scores, start=1):
        key = rank_key(score)
        if previous_key is not None and key == previous_key:
            assigned_rank = previous_rank
        else:
            assigned_rank = position
            previous_rank = position
            previous_key = key
        ranked.append((score.climber.pk, score, assigned_rank))

    return ranked
