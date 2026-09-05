from typing import Any

from accounts.authorization import require_competition_admin, require_competition_judge
from athletes.models import Climber
from competitions.models import CompetitionRound, Route
from django.db import transaction
from django.utils import timezone


from . import types
from . import selectors
from .models import Climb, RoundResult
from .utils import BroadcastScoreUpdate, UpdateRoundScoreForRoute


def add_to_startlist(user, **data: Any) -> types.StartlistEntry:
    try:
        round_obj = CompetitionRound.objects.select_related("competition_category").get(
            id=data["round"], deleted=False
        )
    except CompetitionRound.DoesNotExist:
        raise ValueError(f"Round with id {data['round']} not found")

    require_competition_admin(user, round_obj.competition_category.competition_id)

    try:
        climber = Climber.objects.get(id=data["climber"], deleted=False)
    except Climber.DoesNotExist:
        raise ValueError(f"Climber with id {data['climber']} not found")

    existing = RoundResult.objects.filter(
        round=round_obj,
        climber=climber,
    ).first()

    if existing:
        if not existing.deleted:
            raise ValueError("Climber is already in the start list for this round")

        duplicate_order = RoundResult.objects.filter(
            round=round_obj,
            start_order=data["start_order"],
            deleted=False,
        ).exists()

        if duplicate_order:
            raise ValueError(
                f"Start order {data['start_order']} is already taken in this round"
            )

        existing.deleted = False
        existing.start_order = data["start_order"]
        existing.last_modified_by = user
        existing.save()
        result = existing
    else:
        duplicate_order = RoundResult.objects.filter(
            round=round_obj,
            start_order=data["start_order"],
            deleted=False,
        ).exists()

        if duplicate_order:
            raise ValueError(
                f"Start order {data['start_order']} is already taken in this round"
            )

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

    return types.StartlistEntry(
        id=result.pk,
        climber_id=climber.pk,
        climber_name=climber_name,
        start_order=result.start_order,
        gender=gender,
        rank=result.rank,
    )


def _build_boulder_attempt_record(
    attempts_top: int,
    attempts_zone: int,
    top_reached: bool,
    zone_reached: bool,
) -> types.BoulderAttemptRecord:
    """
    Rules (matching World Climbing boulder scoring):
      - A top implies a zone was reached on the way (so attempts_zone >= 1)
      - attempts_top cannot be fewer than attempts_zone (you reach zone before top)
      - If no zone was reached, attempts_zone mirrors attempts_top
        (there's no separate "attempts to zone" count to track)
    """
    if attempts_top < 0 or attempts_zone < 0:
        raise ValueError("Attempts cannot be negative")

    if top_reached and attempts_top < 1:
        raise ValueError("A top requires at least one attempt")

    if zone_reached and attempts_zone < 1:
        raise ValueError("Reaching a zone requires at least one zone attempt")

    if top_reached and not zone_reached:
        zone_reached = True

    if top_reached and attempts_zone < 1:
        attempts_zone = 1

    if attempts_zone > attempts_top:
        attempts_top = attempts_zone

    if not zone_reached:
        attempts_zone = attempts_top

    return types.BoulderAttemptRecord(
        attempts_top=attempts_top,
        attempts_zone=attempts_zone,
        top_reached=top_reached,
        zone_reached=zone_reached,
    )


def record_climb_attempt(user, **data: Any) -> types.Climb:
    """
    Record a result from a climber on a given boulder.
    """
    try:
        climber = Climber.objects.get(id=data["climber"], deleted=False)
    except Climber.DoesNotExist:
        raise ValueError(f"Climber with id {data['climber']} not found")

    try:
        route = Route.objects.select_related(
            "round__competition_category__competition"
        ).get(id=data["route"], deleted=False)
    except Route.DoesNotExist:
        raise ValueError(f"Route with id {data['route']} not found")

    require_competition_judge(user, route.round.competition_category.competition_id)

    in_startlist = RoundResult.objects.filter(
        round=route.round,
        climber=climber,
        deleted=False,
    ).exists()

    if not in_startlist:
        raise ValueError("Climber is not in the start list for this round")

    record = _build_boulder_attempt_record(
        attempts_top=data.get("attempts_top", 0),
        attempts_zone=data.get("attempts_zone", 0),
        top_reached=data.get("top_reached", False),
        zone_reached=data.get("zone_reached", False),
    )

    with transaction.atomic():
        existing_climb = Climb.objects.filter(
            climber=climber,
            route=route,
        ).first()

        if existing_climb and not existing_climb.deleted:
            raise ValueError("A climb already exists for this climber and route.")

        if existing_climb:
            existing_climb.deleted = False
            existing_climb.attempts_top = record["attempts_top"]
            existing_climb.attempts_zone = record["attempts_zone"]
            existing_climb.top_reached = record["top_reached"]
            existing_climb.zone_reached = record["zone_reached"]
            existing_climb.judge = user
            existing_climb.last_modified_by = user
            existing_climb.save()
            climb = existing_climb
        else:
            climb = Climb.objects.create(
                climber=climber,
                route=route,
                **record,
                judge=user,
                created_by=user,
                last_modified_by=user,
            )

        UpdateRoundScoreForRoute(climb)
        _update_round_results(route.round)
        BroadcastScoreUpdate(route.round.competition_category.competition_id)

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


def _update_round_results(round_obj):
    ranked = selectors.rank_climbers_in_round(round_obj)
    with transaction.atomic():
        for climber_id, _score, rank in ranked:
            RoundResult.objects.filter(
                round=round_obj, climber_id=climber_id, deleted=False
            ).update(rank=rank, last_modified_at=timezone.now())


def update_climb(climb_id: int, user, **update_data: Any) -> types.Climb:
    try:
        climb = Climb.objects.select_related(
            "climber__user_account",
            "route__round__competition_category__competition",
        ).get(id=climb_id, deleted=False)
    except Climb.DoesNotExist:
        raise ValueError(f"Climb with id {climb_id} not found")

    require_competition_judge(
        user, climb.route.round.competition_category.competition_id
    )

    with transaction.atomic():
        normalized = _build_boulder_attempt_record(
            attempts_top=update_data.get("attempts_top", climb.attempts_top),
            attempts_zone=update_data.get("attempts_zone", climb.attempts_zone),
            top_reached=update_data.get("top_reached", climb.top_reached),
            zone_reached=update_data.get("zone_reached", climb.zone_reached),
        )

        for field, value in normalized.items():
            setattr(climb, field, value)

        climb.last_modified_by = user
        climb.save()

        UpdateRoundScoreForRoute(climb)
        _update_round_results(climb.route.round)
        BroadcastScoreUpdate(climb.route.round.competition_category.competition_id)

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


def delete_climb(climb_id: int, user) -> None:
    try:
        climb = Climb.objects.select_related(
            "route__round__competition_category__competition"
        ).get(id=climb_id, deleted=False)
    except Climb.DoesNotExist:
        raise ValueError(f"Climb with id {climb_id} not found")

    require_competition_judge(
        user,
        climb.route.round.competition_category.competition_id,
        message="You do not have permission to delete climbs for this competition",
    )

    round_obj = climb.route.round
    competition_id = round_obj.competition_category.competition_id

    with transaction.atomic():
        climb.deleted = True
        climb.save()

        UpdateRoundScoreForRoute(climb)
        _update_round_results(round_obj)
        BroadcastScoreUpdate(competition_id)


def list_startlist(round_id: int) -> list[types.StartlistEntry]:
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
            types.StartlistEntry(
                id=result.pk,
                climber_id=climber.pk,
                climber_name=climber_name,
                start_order=result.start_order,
                gender=gender,
                rank=result.rank,
            )
        )

    return data


def update_startlist(result_id: int, user, **update_data: Any) -> types.StartlistEntry:
    try:
        result = RoundResult.objects.select_related(
            "round__competition_category",
            "climber__user_account",
        ).get(id=result_id, deleted=False)
    except RoundResult.DoesNotExist:
        raise ValueError(f"Start list entry with id {result_id} not found")

    require_competition_admin(user, result.round.competition_category.competition_id)

    if "start_order" in update_data:
        new_start_order = update_data["start_order"]

        duplicate = (
            RoundResult.objects.filter(
                round=result.round,
                start_order=new_start_order,
                deleted=False,
            )
            .exclude(id=result.pk)
            .exists()
        )

        if duplicate:
            raise ValueError(
                f"Start order {new_start_order} is already taken in this round"
            )

        result.start_order = new_start_order

    result.last_modified_by = user
    result.save()

    climber = result.climber

    if climber.is_simple_athlete:
        climber_name = climber.simple_name
        gender = climber.simple_gender
    else:
        climber_name = climber.user_account.full_name if climber.user_account else None
        gender = climber.user_account.gender if climber.user_account else None

    return types.StartlistEntry(
        id=result.pk,
        climber_id=climber.pk,
        climber_name=climber_name,
        start_order=result.start_order,
        gender=gender,
        rank=result.rank,
    )


def bulk_update_startlist_order(
    round_id: int,
    entries: list[types.StartlistEntry],
    user,
) -> list[dict[str, Any]]:
    """Atomically renumber start_order across every entry in a round.

    The whole new ordering is accepted as one transaction, avoiding the
    intermediate-state collisions that occur when reorders are applied
    one PATCH at a time.
    """
    try:
        round_obj = CompetitionRound.objects.get(id=round_id, deleted=False)
    except CompetitionRound.DoesNotExist:
        raise ValueError(f"Round with id {round_id} not found")

    require_competition_admin(user, round_obj.competition_category.competition_id)

    ids = [e["id"] for e in entries]
    orders = [e["start_order"] for e in entries]

    if len(set(ids)) != len(ids):
        raise ValueError("Duplicate result ids in reorder request")
    if len(set(orders)) != len(orders):
        raise ValueError("Duplicate start orders in reorder request")

    existing = list(
        RoundResult.objects.select_related(
            "climber__user_account",
        ).filter(round=round_obj, deleted=False)
    )
    existing_by_id = {r.pk: r for r in existing}

    missing = [rid for rid in ids if rid not in existing_by_id]
    if missing:
        raise ValueError(f"Start list entries {missing} not found in round {round_id}")

    if len(existing) != len(entries):
        raise ValueError(
            "Reorder must include every start list entry in the round "
            f"(expected {len(existing)}, got {len(entries)})"
        )

    with transaction.atomic():
        for entry in entries:
            row = existing_by_id[entry["id"]]
            row.start_order = entry["start_order"]
            row.last_modified_by = user

        RoundResult.objects.bulk_update(existing, ["start_order", "last_modified_by"])

    existing.sort(key=lambda r: r.start_order or 0)

    data = []
    for result in existing:
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
            types.StartlistEntry(
                id=result.pk,
                climber_id=climber.pk,
                climber_name=climber_name,
                start_order=result.start_order,
                gender=gender,
                rank=result.rank,
            )
        )

    return data


def remove_from_startlist(result_id: int, user) -> None:
    try:
        result = RoundResult.objects.select_related("round__competition_category").get(
            id=result_id, deleted=False
        )
    except RoundResult.DoesNotExist:
        raise ValueError(f"Start list entry with id {result_id} not found")

    require_competition_admin(user, result.round.competition_category.competition_id)

    result.deleted = True
    result.save()


def advance_climbers(round_id: int, user) -> types.AdvanceClimbersResult:
    try:
        current_round = CompetitionRound.objects.select_related(
            "competition_category"
        ).get(id=round_id, deleted=False)
    except CompetitionRound.DoesNotExist:
        raise ValueError(f"Round with id {round_id} not found")

    require_competition_admin(
        user,
        current_round.competition_category.competition_id,
        message="You do not have permission to advance climbers in this competition",
    )

    if not current_round.completed:
        raise ValueError("Round must be marked as completed before advancing climbers")

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
        rank__isnull=False,
    ).order_by("rank")

    if not all_results.exists():
        raise ValueError("No ranked results found for this round")

    if next_round.climbers_advance is None:
        raise ValueError("This round is not configured to advance climbers")
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
        if result.climber.pk in existing_climber_ids:
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
        existing = RoundResult.objects.filter(
            round=next_round,
            climber=result.climber,
        ).first()

        if existing:
            if existing.deleted:
                existing.deleted = False
                existing.start_order = max_order + index
                existing.save()
                added += 1
        else:
            RoundResult.objects.create(
                round=next_round,
                climber=result.climber,
                start_order=max_order + index,
                created_by=result.created_by,
            )
            added += 1

    BroadcastScoreUpdate(current_round.competition_category.competition_id)

    return types.AdvanceClimbersResult(
        advanced=added,
        next_round_id=next_round.pk,
        next_round_name=next_round.round_group.name,
    )
