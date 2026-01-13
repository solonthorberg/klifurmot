from typing import Any, Optional

from django.db import transaction
from django.utils import timezone
from .models import Climb, ClimberRoundScore, RoundResult
from .utils import UpdateRoundScoreForBoulder, BroadcastScoreUpdate
from competitions.models import Boulder, CompetitionRound
from athletes.models import Climber


def list_climbs(
    round_id: int, climber_id: Optional[int] = None
) -> list[dict[str, Any]]:
    queryset = Climb.objects.select_related(
        "climber__user_account",
        "boulder",
    ).filter(
        boulder__round_id=round_id,
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
            {
                "id": climb.id,
                "climber_id": climber.id,
                "climber_name": climber_name,
                "boulder_id": climb.boulder.id,
                "boulder_number": climb.boulder.boulder_number,
                "attempts_top": climb.attempts_top,
                "attempts_zone": climb.attempts_zone,
                "top_reached": climb.top_reached,
                "zone_reached": climb.zone_reached,
            }
        )

    return result


def create_climb(user, **data: Any) -> dict[str, Any]:
    try:
        climber = Climber.objects.get(id=data["climber"], deleted=False)
    except Climber.DoesNotExist:
        raise ValueError(f"Climber with id {data['climber']} not found")

    try:
        boulder = Boulder.objects.select_related(
            "round__competition_category__competition"
        ).get(id=data["boulder"], deleted=False)
    except Boulder.DoesNotExist:
        raise ValueError(f"Boulder with id {data['boulder']} not found")

    in_startlist = RoundResult.objects.filter(
        round=boulder.round,
        climber=climber,
        deleted=False,
    ).exists()

    if not in_startlist:
        raise ValueError("Climber is not in the start list for this round")

    with transaction.atomic():
        climb, created = Climb.objects.update_or_create(
            climber=climber,
            boulder=boulder,
            deleted=False,
            defaults={
                "attempts_top": data.get("attempts_top", 0),
                "attempts_zone": data.get("attempts_zone", 0),
                "top_reached": data.get("top_reached", False),
                "zone_reached": data.get("zone_reached", False),
                "judge": user,
                "last_modified_by": user,
            },
        )

        if created:
            climb.created_by = user
            climb.save()

        UpdateRoundScoreForBoulder(climb)
        _update_round_results(boulder.round)
        BroadcastScoreUpdate(boulder.round.competition_category.competition_id)

    if climber.is_simple_athlete:
        climber_name = climber.simple_name
    else:
        climber_name = climber.user_account.full_name if climber.user_account else None

    return {
        "id": climb.id,
        "climber_id": climber.id,
        "climber_name": climber_name,
        "boulder_id": boulder.id,
        "boulder_number": boulder.boulder_number,
        "attempts_top": climb.attempts_top,
        "attempts_zone": climb.attempts_zone,
        "top_reached": climb.top_reached,
        "zone_reached": climb.zone_reached,
    }


def _update_round_results(round_obj):
    scores = list(
        ClimberRoundScore.objects.filter(round=round_obj).select_related("climber")
    )

    all_rounds = list(
        CompetitionRound.objects.filter(
            competition_category=round_obj.competition_category
        ).order_by("round_order")
    )

    try:
        current_index = all_rounds.index(round_obj)
        previous_round = all_rounds[current_index - 1] if current_index > 0 else None
    except ValueError:
        previous_round = None

    prev_rank_map = {}
    if previous_round:
        prev_results = RoundResult.objects.filter(round=previous_round).select_related(
            "climber"
        )
        prev_rank_map = {res.climber.id: res.rank for res in prev_results}

    scores.sort(key=lambda s: (-s.total_score, prev_rank_map.get(s.climber.id, 9999)))

    actual_rank = 1
    tie_count = 0
    previous_score = None
    previous_rank = None

    for score in scores:
        if previous_score is not None and score.total_score == previous_score:
            assigned_rank = previous_rank
            tie_count += 1
        else:
            if previous_score is not None:
                actual_rank += tie_count
            assigned_rank = actual_rank
            previous_rank = assigned_rank
            tie_count = 1

        RoundResult.objects.update_or_create(
            round=round_obj,
            climber=score.climber,
            defaults={
                "rank": assigned_rank,
                "last_modified_at": timezone.now(),
            },
        )

        previous_score = score.total_score


def get_climb(climb_id: int) -> dict[str, Any]:
    try:
        climb = Climb.objects.select_related(
            "climber__user_account",
            "boulder",
        ).get(id=climb_id, deleted=False)
    except Climb.DoesNotExist:
        raise ValueError(f"Climb with id {climb_id} not found")

    climber = climb.climber

    if climber.is_simple_athlete:
        climber_name = climber.simple_name
    else:
        climber_name = climber.user_account.full_name if climber.user_account else None

    return {
        "id": climb.id,
        "climber_id": climber.id,
        "climber_name": climber_name,
        "boulder_id": climb.boulder.id,
        "boulder_number": climb.boulder.boulder_number,
        "attempts_top": climb.attempts_top,
        "attempts_zone": climb.attempts_zone,
        "top_reached": climb.top_reached,
        "zone_reached": climb.zone_reached,
    }


def update_climb(climb_id: int, user, **update_data: Any) -> dict[str, Any]:
    try:
        climb = Climb.objects.select_related(
            "climber__user_account",
            "boulder__round__competition_category__competition",
        ).get(id=climb_id, deleted=False)
    except Climb.DoesNotExist:
        raise ValueError(f"Climb with id {climb_id} not found")

    with transaction.atomic():
        for field, value in update_data.items():
            if hasattr(climb, field):
                setattr(climb, field, value)

        climb.last_modified_by = user
        climb.save()

        UpdateRoundScoreForBoulder(climb)
        _update_round_results(climb.boulder.round)
        BroadcastScoreUpdate(climb.boulder.round.competition_category.competition_id)

    climber = climb.climber

    if climber.is_simple_athlete:
        climber_name = climber.simple_name
    else:
        climber_name = climber.user_account.full_name if climber.user_account else None

    return {
        "id": climb.id,
        "climber_id": climber.id,
        "climber_name": climber_name,
        "boulder_id": climb.boulder.id,
        "boulder_number": climb.boulder.boulder_number,
        "attempts_top": climb.attempts_top,
        "attempts_zone": climb.attempts_zone,
        "top_reached": climb.top_reached,
        "zone_reached": climb.zone_reached,
    }


def delete_climb(climb_id: int) -> None:
    try:
        climb = Climb.objects.select_related(
            "boulder__round__competition_category__competition"
        ).get(id=climb_id, deleted=False)
    except Climb.DoesNotExist:
        raise ValueError(f"Climb with id {climb_id} not found")

    round_obj = climb.boulder.round
    competition_id = round_obj.competition_category.competition_id

    with transaction.atomic():
        climb.deleted = True
        climb.save()

        UpdateRoundScoreForBoulder(climb)
        _update_round_results(round_obj)
        BroadcastScoreUpdate(competition_id)


def list_startlist(round_id: int) -> list[dict[str, Any]]:
    results = (
        RoundResult.objects.select_related(
            "climber__user_account",
        )
        .filter(
            round_id=round_id,
            deleted=False,
        )
        .order_by("start_order")
    )

    data = []

    for result in results:
        climber = result.climber

        if climber.is_simple_athlete:
            climber_name = climber.simple_name
            gender = climber.simple_gender
        else:
            climber_name = (
                climber.user_account.full_name if climber.user_account else None
            )
            gender = climber.user_account.gender if climber.user_account else None

        data.append(
            {
                "id": result.id,
                "climber_id": climber.id,
                "climber_name": climber_name,
                "start_order": result.start_order,
                "gender": gender,
                "rank": result.rank,
            }
        )

    return data


def add_to_startlist(user, **data: Any) -> dict[str, Any]:
    try:
        round_obj = CompetitionRound.objects.get(id=data["round"], deleted=False)
    except CompetitionRound.DoesNotExist:
        raise ValueError(f"Round with id {data['round']} not found")

    try:
        climber = Climber.objects.get(id=data["climber"], deleted=False)
    except Climber.DoesNotExist:
        raise ValueError(f"Climber with id {data['climber']} not found")

    duplicate_order = RoundResult.objects.filter(
        round=round_obj,
        start_order=data["start_order"],
        deleted=False,
    ).exists()

    if duplicate_order:
        raise ValueError(
            f"Start order {data['start_order']} is already taken in this round"
        )

    existing = RoundResult.objects.filter(
        round=round_obj,
        climber=climber,
        deleted=False,
    ).exists()

    if existing:
        raise ValueError("Climber is already in the start list for this round")

    result = RoundResult.objects.create(
        round=round_obj,
        climber=climber,
        start_order=data["start_order"],
        created_by=user,
        last_modified_by=user,
    )

    if climber.is_simple_athlete:
        climber_name = climber.simple_name
        gender = climber.simple_gender
    else:
        climber_name = climber.user_account.full_name if climber.user_account else None
        gender = climber.user_account.gender if climber.user_account else None

    return {
        "id": result.id,
        "climber_id": climber.id,
        "climber_name": climber_name,
        "start_order": result.start_order,
        "gender": gender,
        "rank": result.rank,
    }


def update_startlist(result_id: int, user, **update_data: Any) -> dict[str, Any]:
    try:
        result = RoundResult.objects.select_related(
            "climber__user_account",
            "round",
        ).get(id=result_id, deleted=False)
    except RoundResult.DoesNotExist:
        raise ValueError(f"Start list entry with id {result_id} not found")

    if "start_order" in update_data:
        duplicate_order = (
            RoundResult.objects.filter(
                round=result.round,
                start_order=update_data["start_order"],
                deleted=False,
            )
            .exclude(id=result_id)
            .exists()
        )

        if duplicate_order:
            raise ValueError(
                f"Start order {update_data['start_order']} is already taken in this round"
            )

        result.start_order = update_data["start_order"]

    result.last_modified_by = user
    result.save()

    climber = result.climber

    if climber.is_simple_athlete:
        climber_name = climber.simple_name
        gender = climber.simple_gender
    else:
        climber_name = climber.user_account.full_name if climber.user_account else None
        gender = climber.user_account.gender if climber.user_account else None

    return {
        "id": result.id,
        "climber_id": climber.id,
        "climber_name": climber_name,
        "start_order": result.start_order,
        "gender": gender,
        "rank": result.rank,
    }


def remove_from_startlist(result_id: int) -> None:
    try:
        result = RoundResult.objects.get(id=result_id, deleted=False)
    except RoundResult.DoesNotExist:
        raise ValueError(f"Start list entry with id {result_id} not found")

    result.deleted = True
    result.save()


def list_scores(round_id: int) -> list[dict[str, Any]]:
    scores = (
        ClimberRoundScore.objects.select_related(
            "climber__user_account",
        )
        .filter(
            round_id=round_id,
            deleted=False,
        )
        .order_by("-total_score")
    )

    result = []

    for idx, score in enumerate(scores):
        climber = score.climber

        if climber.is_simple_athlete:
            climber_name = climber.simple_name
        else:
            climber_name = (
                climber.user_account.full_name if climber.user_account else None
            )

        result.append(
            {
                "rank": idx + 1,
                "climber_id": climber.id,
                "climber_name": climber_name,
                "tops": score.tops,
                "zones": score.zones,
                "attempts_tops": score.attempts_tops,
                "attempts_zones": score.attempts_zones,
                "total_score": float(score.total_score),
            }
        )

    return result


def advance_climbers(round_id: int) -> dict[str, Any]:
    try:
        current_round = CompetitionRound.objects.get(id=round_id, deleted=False)
    except CompetitionRound.DoesNotExist:
        raise ValueError(f"Round with id {round_id} not found")

    all_rounds = list(
        CompetitionRound.objects.filter(
            competition_category=current_round.competition_category,
            deleted=False,
        ).order_by("round_order")
    )

    try:
        current_index = all_rounds.index(current_round)
        next_round = (
            all_rounds[current_index + 1]
            if current_index + 1 < len(all_rounds)
            else None
        )
    except (ValueError, IndexError):
        next_round = None

    if not next_round:
        raise ValueError("No next round found")

    all_results = RoundResult.objects.filter(
        round=current_round,
        deleted=False,
    ).order_by("rank")

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
            defaults={
                "start_order": max_order + index,
                "created_by": result.created_by,
            },
        )
        if created:
            added += 1

    BroadcastScoreUpdate(current_round.competition_category.competition_id)

    return {
        "advanced": added,
        "next_round_id": next_round.id,
        "next_round_name": next_round.round_group.name,
    }
