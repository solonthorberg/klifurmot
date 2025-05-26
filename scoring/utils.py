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
                    else "Nafn óþekkt"
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
            "category": str(category),
            "rounds": rounds_data
        })

    return categories_data


def broadcast_score_update(competition_id):
    data = format_competition_results(competition_id)
    print("✅ Broadcasting result data:", data)

    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"competition_{competition_id}",
        {
            "type": "send_result_update",
            "data": data
        }
    )


from scoring.utils import broadcast_score_update  # ✅ Make sure this is imported

def auto_advance_climbers(current_round):
    top_results = (
        RoundResult.objects
        .filter(round=current_round, deleted=False)
        .order_by('rank')[:current_round.climbers_advance]
    )

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

    existing_orders = (
        RoundResult.objects
        .filter(round=next_round)
        .values_list('start_order', flat=True)
    )
    max_order = max(existing_orders, default=0) or 0

    added = 0
    for index, result in enumerate(top_results, start=1):
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

    # ✅ Trigger live update for results
    broadcast_score_update(current_round.competition_category.competition_id)

    return {"status": "ok", "advanced": added, "next_round_id": next_round.id}
