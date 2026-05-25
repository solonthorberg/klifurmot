from typing import Any, Optional

from django.db import transaction
from django.utils import timezone
from .models import Climb, ClimberRoundScore, RoundResult
from .utils import UpdateRoundScoreForBoulder, BroadcastScoreUpdate
from competitions.models import Boulder, CompetitionRound
from athletes.models import Climber
from accounts.authorization import require_competition_judge, require_competition_admin


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
                "id": climb.pk,
                "climber_id": climber.pk,
                "climber_name": climber_name,
                "boulder_id": climb.boulder.pk,
                "boulder_number": climb.boulder.boulder_number,
                "attempts_top": climb.attempts_top,
                "attempts_zone": climb.attempts_zone,
                "top_reached": climb.top_reached,
                "zone_reached": climb.zone_reached,
            }
        )

    return result


def add_to_startlist(user, **data: Any) -> dict[str, Any]:
    try:
        round_obj = CompetitionRound.objects.get(id=data["round"], deleted=False)
    except CompetitionRound.DoesNotExist:
        raise ValueError(f"Round with id {data['round']} not found")

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

    return {
        "id": result.pk,
        "climber_id": climber.pk,
        "climber_name": climber_name,
        "start_order": result.start_order,
        "gender": gender,
        "rank": result.rank,
    }


def _normalize_climb_data(
    attempts_top: int,
    attempts_zone: int,
    top_reached: bool,
    zone_reached: bool,
) -> dict[str, Any]:
    """
    Apply consistency rules to climb data. Returns the (possibly adjusted)
    values as a dict ready to splat into Climb fields.

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

    if top_reached and not zone_reached:
        zone_reached = True

    if top_reached and attempts_zone < 1:
        attempts_zone = 1

    if attempts_zone > attempts_top:
        attempts_top = attempts_zone

    if not zone_reached:
        attempts_zone = attempts_top

    return {
        "attempts_top": attempts_top,
        "attempts_zone": attempts_zone,
        "top_reached": top_reached,
        "zone_reached": zone_reached,
    }


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

    require_competition_judge(user, boulder.round.competition_category.competition_id)

    in_startlist = RoundResult.objects.filter(
        round=boulder.round,
        climber=climber,
        deleted=False,
    ).exists()

    if not in_startlist:
        raise ValueError("Climber is not in the start list for this round")

    normalized = _normalize_climb_data(
        attempts_top=data.get("attempts_top", 0),
        attempts_zone=data.get("attempts_zone", 0),
        top_reached=data.get("top_reached", False),
        zone_reached=data.get("zone_reached", False),
    )

    with transaction.atomic():
        existing = Climb.objects.filter(
            climber=climber,
            boulder=boulder,
        ).first()

        if existing and not existing.deleted:
            raise ValueError("A climb already exists for this climber and boulder.")

        if existing:
            existing.deleted = False
            existing.attempts_top = normalized["attempts_top"]
            existing.attempts_zone = normalized["attempts_zone"]
            existing.top_reached = normalized["top_reached"]
            existing.zone_reached = normalized["zone_reached"]
            existing.judge = user
            existing.last_modified_by = user
            existing.save()
            climb = existing
        else:
            climb = Climb.objects.create(
                climber=climber,
                boulder=boulder,
                **normalized,
                judge=user,
                created_by=user,
                last_modified_by=user,
            )

        UpdateRoundScoreForBoulder(climb)
        _update_round_results(boulder.round)
        BroadcastScoreUpdate(boulder.round.competition_category.competition_id)

    if climber.is_simple_athlete:
        climber_name = climber.simple_name
    else:
        climber_name = climber.user_account.full_name if climber.user_account else None

    return {
        "id": climb.pk,
        "climber_id": climber.pk,
        "climber_name": climber_name,
        "boulder_id": boulder.pk,
        "boulder_number": boulder.boulder_number,
        "attempts_top": climb.attempts_top,
        "attempts_zone": climb.attempts_zone,
        "top_reached": climb.top_reached,
        "zone_reached": climb.zone_reached,
    }


def _update_round_results(round_obj):
    ranked = _rank_climbers_in_round(round_obj)
    with transaction.atomic():
        for climber_id, _score, rank in ranked:
            RoundResult.objects.filter(
                round=round_obj, climber_id=climber_id, deleted=False
            ).update(rank=rank, last_modified_at=timezone.now())


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
        "id": climb.pk,
        "climber_id": climber.pk,
        "climber_name": climber_name,
        "boulder_id": climb.boulder.pk,
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

    require_competition_judge(
        user, climb.boulder.round.competition_category.competition_id
    )

    with transaction.atomic():
        normalized = _normalize_climb_data(
            attempts_top=update_data.get("attempts_top", climb.attempts_top),
            attempts_zone=update_data.get("attempts_zone", climb.attempts_zone),
            top_reached=update_data.get("top_reached", climb.top_reached),
            zone_reached=update_data.get("zone_reached", climb.zone_reached),
        )

        for field, value in normalized.items():
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
        "id": climb.pk,
        "climber_id": climber.pk,
        "climber_name": climber_name,
        "boulder_id": climb.boulder.pk,
        "boulder_number": climb.boulder.boulder_number,
        "attempts_top": climb.attempts_top,
        "attempts_zone": climb.attempts_zone,
        "top_reached": climb.top_reached,
        "zone_reached": climb.zone_reached,
    }


def delete_climb(climb_id: int, user) -> None:
    try:
        climb = Climb.objects.select_related(
            "boulder__round__competition_category__competition"
        ).get(id=climb_id, deleted=False)
    except Climb.DoesNotExist:
        raise ValueError(f"Climb with id {climb_id} not found")

    require_competition_judge(
        user,
        climb.boulder.round.competition_category.competition_id,
        message="You do not have permission to delete climbs for this competition",
    )

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
                "id": result.pk,
                "climber_id": climber.pk,
                "climber_name": climber_name,
                "start_order": result.start_order,
                "gender": gender,
                "rank": result.rank,
            }
        )

    return data


def update_startlist(result_id: int, user, **update_data: Any):
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

    return {
        "id": result.pk,
        "climber_id": climber.pk,
        "climber_name": climber_name,
        "start_order": result.start_order,
        "gender": gender,
        "rank": result.rank,
    }


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


def list_scores(round_id: int) -> list[dict[str, Any]]:
    try:
        round_obj = CompetitionRound.objects.get(id=round_id, deleted=False)
    except CompetitionRound.DoesNotExist:
        return []

    ranked = _rank_climbers_in_round(round_obj)

    result = []
    for climber_id, score, rank in ranked:
        climber = score.climber
        climber_name = (
            climber.simple_name
            if climber.is_simple_athlete
            else (climber.user_account.full_name if climber.user_account else None)
        )
        result.append(
            {
                "rank": rank,
                "climber_id": climber_id,
                "climber_name": climber_name,
                "tops": score.tops,
                "zones": score.zones,
                "attempts_tops": score.attempts_tops,
                "attempts_zones": score.attempts_zones,
                "total_score": float(score.total_score),
            }
        )

    return result


def advance_climbers(round_id: int, user) -> dict[str, Any]:
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

    return {
        "advanced": added,
        "next_round_id": next_round.pk,
        "next_round_name": next_round.round_group.name,
    }


def _rank_climbers_in_round(round_obj):
    """
    IFSC boulder ranking (Annex C §7.1):
      1. total_score descending
      2. countback to previous round rank (no group-split for klifurmot)
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
