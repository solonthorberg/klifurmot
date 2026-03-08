import logging

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from competitions.services import get_competition_results
from scoring.models import ClimberRoundScore, RoundResult
from competitions.models import CompetitionRound


logger = logging.getLogger(__name__)


def BroadcastScoreUpdate(competition_id):
    data = get_competition_results(competition_id)

    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"competition_{competition_id}",
        {
            "type": "score_update",
            "data": data,
        },
    )


def AutoAdvanceClimbers(current_round):
    all_results = RoundResult.objects.filter(
        round=current_round,
        deleted=False,
    ).order_by("rank")

    next_round = (
        CompetitionRound.objects.filter(
            competition_category=current_round.competition_category,
            round_order__gt=current_round.round_order,
            deleted=False,
        )
        .order_by("round_order")
        .first()
    )

    if not next_round:
        logger.warning(f"No next round found for round {current_round.id}")
        return {"status": "error", "message": "No next round found"}

    num_to_advance = next_round.climbers_advance

    existing_climber_ids = set(
        RoundResult.objects.filter(
            round=next_round,
            deleted=False,
        ).values_list("climber_id", flat=True)
    )

    selected = []
    cutoff_rank = None

    for result in all_results:
        if result.climber_id in existing_climber_ids:
            continue

        if len(selected) < num_to_advance:
            selected.append(result)
            cutoff_rank = result.rank
        elif result.rank == cutoff_rank:
            selected.append(result)
        else:
            break

    selected.reverse()

    existing_orders = RoundResult.objects.filter(
        round=next_round,
        deleted=False,
    ).values_list("start_order", flat=True)

    max_order = max(existing_orders, default=0) or 0

    added = 0
    for index, result in enumerate(selected, start=1):
        _, created = RoundResult.objects.get_or_create(
            round=next_round,
            climber=result.climber,
            deleted=False,
            defaults={
                "start_order": max_order + index,
                "created_by": result.created_by,
            },
        )
        if created:
            added += 1

    BroadcastScoreUpdate(current_round.competition_category.competition_id)

    return {"status": "ok", "advanced": added, "next_round_id": next_round.id}


def UpdateRoundScoreForBoulder(climb):
    climber = climb.climber
    round_obj = climb.boulder.round

    if not climber or not round_obj:
        return

    boulder_climbs = climber.climb_set.filter(
        boulder__round=round_obj,
        deleted=False,
    )

    total_tops = sum(1 for c in boulder_climbs if c.top_reached)
    total_zones = sum(1 for c in boulder_climbs if c.zone_reached)
    attempts_tops = sum(c.attempts_top for c in boulder_climbs if c.top_reached)
    attempts_zones = sum(c.attempts_zone for c in boulder_climbs if c.zone_reached)

    zone_score = 0
    top_score = 0

    for c in boulder_climbs:
        if c.top_reached:
            top_score += 25 - 0.1 * (c.attempts_top - 1)
        elif c.zone_reached:
            zone_score += 10 - 0.1 * (c.attempts_zone - 1)

    total_score = round(zone_score + top_score, 1)

    ClimberRoundScore.objects.update_or_create(
        climber=climber,
        round=round_obj,
        deleted=False,
        defaults={
            "total_score": total_score,
            "tops": total_tops,
            "zones": total_zones,
            "attempts_tops": attempts_tops,
            "attempts_zones": attempts_zones,
        },
    )
