from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from scoring.models import ClimberRoundScore, RoundResult
from competitions.models import CompetitionCategory, CompetitionRound


def format_competition_results(competition_id):
    categories_data = []

    categories = CompetitionCategory.objects.filter(
        competition_id=competition_id
    ).prefetch_related('competitionround_set', 'category_group')

    for category in categories:
        rounds_data = []

        for round_obj in category.competitionround_set.all().order_by('round_order'):
            round_results = (
                RoundResult.objects
                .filter(round=round_obj)
                .select_related('climber__user_account')
                .order_by('rank')
            )

            climber_ids = [r.climber.id for r in round_results]
            scores_map = {
                s.climber.id: s
                for s in ClimberRoundScore.objects.filter(round=round_obj, climber_id__in=climber_ids)
            }

            formatted_results = []
            for result in round_results:
                score = scores_map.get(result.climber.id)
                if not score:
                    continue
                full_name = (
                    result.climber.user_account.full_name
                    if result.climber.user_account and result.climber.user_account.full_name
                    else "Name unknown"
                )
                formatted_results.append({
                    "rank": result.rank,
                    "full_name": full_name,
                    "tops": score.tops,
                    "attempts_top": score.attempts_tops,
                    "zones": score.zones,
                    "attempts_zone": score.attempts_zones,
                    "total_score": float(round(score.total_score, 1)),
                })

            rounds_data.append({
                "round_name": round_obj.round_group.name,
                "results": formatted_results
            })

        categories_data.append({
            "category": {
                "id": category.id,
                "gender": category.gender,
                "group": {
                    "id": category.category_group.id,
                    "name": category.category_group.name
                }
            },
            "rounds": rounds_data
        })

    return categories_data



def broadcast_score_update(competition_id):
    data = format_competition_results(competition_id)

    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"competition_{competition_id}",
        {
            "type": "send_result_update",
            "data": data
        }
    )


from scoring.utils import broadcast_score_update 

def auto_advance_climbers(current_round):
    """
    Auto-advance climbers to the next round for the same category
    """
    all_results = RoundResult.objects.filter(
        round=current_round, 
        deleted=False
    ).order_by('rank')
    
    next_round = (
        CompetitionRound.objects
        .filter(
            competition_category=current_round.competition_category,
            round_order__gt=current_round.round_order
        )
        .order_by('round_order')
        .first()
    )

    if not next_round:
        print("⚠️ No next round found.")
        return {"status": "error", "message": "No next round found"}

    num_to_advance = next_round.climbers_advance

    existing_climber_ids = set(
        RoundResult.objects
        .filter(round=next_round)
        .values_list("climber_id", flat=True)
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

    existing_orders = (
        RoundResult.objects
        .filter(round=next_round)
        .values_list('start_order', flat=True)
    )
    max_order = max(existing_orders, default=0) or 0

    added = 0
    for index, result in enumerate(selected, start=1):
        _, created = RoundResult.objects.get_or_create(
            round=next_round,
            climber=result.climber,
            defaults={
                "start_order": max_order + index,
                "created_by": result.created_by,
            }
        )
        if created:
            added += 1

    broadcast_score_update(current_round.competition_category.competition_id)

    return {"status": "ok", "advanced": added, "next_round_id": next_round.id}


def update_round_score_for_climb(climb):
    climber = climb.climber
    round_obj = climb.boulder.round

    if not climber or not round_obj:
        return

    climbs = climber.climb_set.filter(boulder__round=round_obj)

    total_tops = sum(1 for c in climbs if c.top_reached)
    total_zones = sum(1 for c in climbs if c.zone_reached)
    attempts_tops = sum(c.attempts_top for c in climbs if c.top_reached)
    attempts_zones = sum(c.attempts_zone for c in climbs if c.zone_reached)

    zone_score = 0
    top_score = 0

    for c in climbs:
        if c.top_reached:
            top_score += 25 - 0.1 * (c.attempts_top - 1)
        elif c.zone_reached:
            zone_score += 10 - 0.1 * (c.attempts_zone - 1)

    total_score = round(zone_score + top_score, 1)        

    ClimberRoundScore.objects.update_or_create(
        climber=climber,
        round=round_obj,
        defaults={
            'total_score': total_score,
            'tops': total_tops,
            'zones': total_zones,
            'attempts_tops': attempts_tops,
            'attempts_zones': attempts_zones,
        }
    )