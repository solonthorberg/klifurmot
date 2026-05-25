import logging

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from competitions.services import get_competition_results
from scoring.models import ClimberRoundScore


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
