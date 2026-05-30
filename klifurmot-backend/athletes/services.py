from django.utils import timezone as dj_timezone
from typing import Any, Optional, cast

from accounts.authorization import require_competition_admin
from accounts.models import UserAccount
from django.db import transaction
from .models import Climber, CompetitionRegistration
from .utils import (
    build_age_category_resolver,
    calculate_age,
    calculate_age_for_category,
    get_age_based_category,
)
from competitions.models import CompetitionRound
from scoring.models import RoundResult
from django.db.models import Q


def list_public_athletes(search: Optional[str] = None) -> list[dict[str, Any]]:
    queryset = (
        Climber.objects.select_related("user_account__nationality")
        .filter(
            deleted=False,
            is_simple_athlete=False,
            user_account__isnull=False,
        )
        .distinct()
    )

    if search:
        queryset = queryset.filter(user_account__full_name__icontains=search)

    result = []

    category_for_age = build_age_category_resolver()
    for climber in queryset:
        user_account = climber.user_account

        if not user_account:
            continue

        age = (
            calculate_age(user_account.date_of_birth)
            if user_account.date_of_birth
            else None
        )
        category_age = (
            calculate_age_for_category(user_account.date_of_birth)
            if user_account.date_of_birth
            else None
        )

        result.append(
            {
                "id": climber.pk,
                "user_account_id": user_account.id,
                "name": user_account.full_name or "Name not provided",
                "age": age,
                "gender": user_account.gender,
                "category": category_for_age(category_age),
                "nationality": user_account.nationality.country_code
                if user_account.nationality
                else None,
            }
        )

    return result


def get_athlete_detail(athlete_id: int) -> dict[str, Any]:
    try:
        climber = Climber.objects.select_related("user_account__nationality").get(
            id=athlete_id, deleted=False, is_simple_athlete=False
        )
    except Climber.DoesNotExist:
        raise ValueError(f"Athlete with id {athlete_id} not found")

    user_account = climber.user_account

    if not user_account:
        raise ValueError(f"Athlete with id {athlete_id} not found")

    age = (
        calculate_age(user_account.date_of_birth)
        if user_account.date_of_birth
        else None
    )
    category_age = (
        calculate_age_for_category(user_account.date_of_birth)
        if user_account.date_of_birth
        else None
    )

    registrations = CompetitionRegistration.objects.filter(
        climber=climber,
        deleted=False,
        competition__end_date__lt=dj_timezone.now(),
    ).select_related("competition", "competition_category__category_group")

    competitions_result = []
    for reg in registrations:
        results = _get_climber_results(reg.competition, climber)
        competitions_result.append(
            {
                "id": reg.competition.id,
                "title": reg.competition.title,
                "category": f"{reg.competition_category.category_group.name} {reg.competition_category.gender}",
                "start_date": reg.competition.start_date,
                "results": results,
            }
        )

    wins = sum(_calculate_wins(reg.competition, climber) for reg in registrations)

    return {
        "id": climber.pk,
        "user_account_id": user_account.id,
        "full_name": user_account.full_name or "Name not provided",
        "age": age,
        "height_cm": user_account.height_cm,
        "wingspan_cm": user_account.wingspan_cm,
        "profile_picture": user_account.profile_picture.url
        if user_account.profile_picture
        else None,
        "gender": user_account.gender,
        "nationality": user_account.nationality.name_local
        if user_account.nationality
        else None,
        "category": get_age_based_category(category_age) if category_age else None,
        "competitions_count": registrations.count(),
        "wins_count": wins,
        "competition_results": competitions_result,
    }


def _get_climber_results(competition, climber) -> list[dict[str, Any]]:
    rounds = (
        CompetitionRound.objects.filter(
            competition_category__competition=competition,
            deleted=False,
        )
        .select_related("round_group")
        .order_by("-round_order")
    )

    climber_results = []
    latest_rank = None

    for round in rounds:
        round_result = RoundResult.objects.filter(
            round=round,
            climber=climber,
            deleted=False,
        ).first()

        if round_result:
            if latest_rank is None:
                latest_rank = round_result.rank

            climber_results.append(
                {
                    "round_name": round.round_group.name,
                    "round_order": round.round_order,
                    "rank": latest_rank,
                }
            )

    return climber_results


def _calculate_wins(competition, climber) -> int:
    rounds = CompetitionRound.objects.filter(
        competition_category__competition=competition,
        deleted=False,
    )

    final_round = rounds.order_by("-round_order").first()

    if not final_round:
        return 0

    final_result = RoundResult.objects.filter(
        round=final_round,
        climber=climber,
        deleted=False,
    ).first()

    if final_result and final_result.rank == 1:
        return 1

    return 0


def list_all_climbers(search: Optional[str] = None) -> list[dict[str, Any]]:
    queryset = Climber.objects.select_related("user_account__nationality").filter(
        deleted=False
    )

    if search:
        queryset = queryset.filter(
            Q(simple_name__icontains=search)
            | Q(user_account__full_name__icontains=search)
        )

    result = []

    for climber in queryset:
        if climber.is_simple_athlete:
            result.append(
                {
                    "id": climber.pk,
                    "is_simple_athlete": True,
                    "name": climber.simple_name,
                    "age": climber.simple_age,
                    "gender": climber.simple_gender,
                    "category": get_age_based_category(climber.simple_age)
                    if climber.simple_age
                    else None,
                }
            )
        else:
            user_account = climber.user_account
            if not user_account:
                continue

            age = (
                calculate_age(user_account.date_of_birth)
                if user_account.date_of_birth
                else None
            )
            category_age = (
                calculate_age_for_category(user_account.date_of_birth)
                if user_account.date_of_birth
                else None
            )

            result.append(
                {
                    "id": climber.pk,
                    "is_simple_athlete": False,
                    "user_account_id": user_account.id,
                    "name": user_account.full_name or "Name not provided",
                    "age": age,
                    "gender": user_account.gender,
                    "category": get_age_based_category(category_age)
                    if category_age
                    else None,
                    "nationality": user_account.nationality.country_code
                    if user_account.nationality
                    else None,
                }
            )

    return result


def create_climber(user, **data: Any) -> dict[str, Any]:
    climber = Climber.objects.create(
        simple_name=data["name"],
        simple_age=data["age"],
        simple_gender=data["gender"],
        is_simple_athlete=True,
        created_by=user,
        last_modified_by=user,
    )

    return {
        "id": climber.pk,
        "is_simple_athlete": True,
        "name": climber.simple_name,
        "age": climber.simple_age,
        "gender": climber.simple_gender,
    }


def get_climber(climber_id: int) -> dict[str, Any]:
    try:
        climber = Climber.objects.select_related("user_account__nationality").get(
            id=climber_id, deleted=False
        )
    except Climber.DoesNotExist:
        raise ValueError(f"Climber with id {climber_id} not found")

    if climber.is_simple_athlete:
        return {
            "id": climber.pk,
            "is_simple_athlete": True,
            "name": climber.simple_name,
            "age": climber.simple_age,
            "gender": climber.simple_gender,
            "category": get_age_based_category(climber.simple_age)
            if climber.simple_age
            else None,
        }

    user_account = climber.user_account

    if not user_account:
        raise ValueError(f"Climber with id {climber_id} not found")

    age = (
        calculate_age(user_account.date_of_birth)
        if user_account.date_of_birth
        else None
    )

    return {
        "id": climber.pk,
        "is_simple_athlete": False,
        "user_account_id": user_account.id,
        "name": user_account.full_name or "Name not provided",
        "age": age,
        "gender": user_account.gender,
        "category": get_age_based_category(age) if age else None,
        "nationality": user_account.nationality.country_code
        if user_account.nationality
        else None,
    }


def update_climber(climber_id: int, user, **update_data: Any) -> dict[str, Any]:
    try:
        climber = Climber.objects.get(id=climber_id, deleted=False)
    except Climber.DoesNotExist:
        raise ValueError(f"Climber with id {climber_id} not found")

    if not climber.is_simple_athlete:
        raise ValueError(
            "Cannot update regular athletes directly. Update the user account instead."
        )

    if "name" in update_data:
        climber.simple_name = update_data["name"]

    if "age" in update_data:
        climber.simple_age = update_data["age"]

    if "gender" in update_data:
        climber.simple_gender = update_data["gender"]

    climber.last_modified_by = user
    climber.save()

    return {
        "id": climber.pk,
        "is_simple_athlete": True,
        "name": climber.simple_name,
        "age": climber.simple_age,
        "gender": climber.simple_gender,
        "category": get_age_based_category(climber.simple_age)
        if climber.simple_age
        else None,
    }


def delete_climber(climber_id: int) -> None:
    from scoring.models import Climb, ClimberRoundScore, RoundResult

    try:
        climber = Climber.objects.get(id=climber_id, deleted=False)
    except Climber.DoesNotExist:
        raise ValueError(f"Climber with id {climber_id} not found")

    with transaction.atomic():
        Climb.objects.filter(
            climber=climber,
            deleted=False,
        ).update(deleted=True)

        ClimberRoundScore.objects.filter(
            climber=climber,
            deleted=False,
        ).update(deleted=True)

        RoundResult.objects.filter(
            climber=climber,
            deleted=False,
        ).update(deleted=True)

        CompetitionRegistration.objects.filter(
            climber=climber,
            deleted=False,
        ).update(deleted=True)

        climber.deleted = True
        climber.save()


def link_climber(user, climber_id: int, user_account_id: int) -> dict[str, Any]:
    try:
        climber = Climber.objects.get(
            id=climber_id, is_simple_athlete=True, deleted=False
        )
    except Climber.DoesNotExist:
        raise ValueError(f"Simple climber with id {climber_id} not found")

    try:
        user_account = UserAccount.objects.get(id=user_account_id)
    except UserAccount.DoesNotExist:
        raise ValueError(f"User account with id {user_account_id} not found")

    existing = Climber.objects.filter(user_account=user_account, deleted=False).exists()

    if existing:
        raise ValueError("User account already has a climber linked")

    if user_account.gender and climber.simple_gender:
        if climber.simple_gender != user_account.gender:
            raise ValueError(
                f"Gender mismatch: climber is {climber.simple_gender} but user account is {user_account.gender}"
            )

    with transaction.atomic():
        cast(Any, climber).user_account = user_account
        climber.is_simple_athlete = False
        climber.simple_name = None
        climber.simple_age = None
        climber.simple_gender = None
        climber.last_modified_by = user
        climber.save()

    return {
        "id": climber.pk,
        "is_simple_athlete": False,
        "user_account_id": user_account.pk,
        "name": user_account.full_name,
        "age": calculate_age(user_account.date_of_birth)
        if user_account.date_of_birth
        else None,
        "gender": user_account.gender,
    }


def list_registrations(competition_id: Optional[int] = None) -> list[dict[str, Any]]:
    queryset = CompetitionRegistration.objects.select_related(
        "climber__user_account",
        "competition",
        "competition_category__category_group",
    ).filter(deleted=False)

    if competition_id:
        queryset = queryset.filter(competition_id=competition_id)

    result = []

    for reg in queryset:
        climber = reg.climber

        if climber.is_simple_athlete:
            climber_name = climber.simple_name
        else:
            climber_name = (
                climber.user_account.full_name if climber.user_account else None
            )

        result.append(
            {
                "id": reg.pk,
                "climber_id": climber.pk,
                "climber_name": climber_name,
                "competition_id": reg.competition.id,
                "competition_title": reg.competition.title,
                "category": f"{reg.competition_category.category_group.name} {reg.competition_category.gender}",
            }
        )

    return result


def create_registration(user, **data: Any) -> dict[str, Any]:
    from competitions.models import Competition, CompetitionCategory

    try:
        climber = Climber.objects.get(id=data["climber"], deleted=False)
    except Climber.DoesNotExist:
        raise ValueError(f"Climber with id {data['climber']} not found")

    try:
        competition = Competition.objects.get(id=data["competition"], deleted=False)
    except Competition.DoesNotExist:
        raise ValueError(f"Competition with id {data['competition']} not found")

    try:
        category = CompetitionCategory.objects.get(
            id=data["competition_category"],
            deleted=False,
        )
    except CompetitionCategory.DoesNotExist:
        raise ValueError(
            f"Competition category with id {data['competition_category']} not found"
        )

    if category.competition.pk != competition.pk:
        raise ValueError("Category does not belong to this competition")

    existing = CompetitionRegistration.objects.filter(
        climber=climber,
        competition=competition,
        competition_category=category,
    ).first()

    if existing:
        if not existing.deleted:
            raise ValueError("Climber is already registered for this competition")

        existing.deleted = False
        existing.last_modified_by = user
        existing.save()
        registration = existing
    else:
        registration = CompetitionRegistration.objects.create(
            climber=climber,
            competition=competition,
            competition_category=category,
            created_by=user,
            last_modified_by=user,
        )

    if climber.is_simple_athlete:
        climber_name = climber.simple_name
    else:
        climber_name = climber.user_account.full_name if climber.user_account else None

    return {
        "id": registration.pk,
        "climber_id": climber.pk,
        "climber_name": climber_name,
        "competition_id": competition.pk,
        "competition_title": competition.title,
        "category": f"{category.category_group.name} {category.gender}",
    }


def delete_registration(registration_id: int, user) -> None:
    from scoring.models import Climb, ClimberRoundScore, RoundResult

    try:
        registration = CompetitionRegistration.objects.select_related(
            "competition"
        ).get(id=registration_id, deleted=False)
    except CompetitionRegistration.DoesNotExist:
        raise ValueError(f"Registration with id {registration_id} not found")

    require_competition_admin(user, registration.competition.pk)

    with transaction.atomic():
        Climb.objects.filter(
            route__round__competition_category__competition=registration.competition,
            climber=registration.climber,
            deleted=False,
        ).update(deleted=True)

        ClimberRoundScore.objects.filter(
            round__competition_category__competition=registration.competition,
            climber=registration.climber,
            deleted=False,
        ).update(deleted=True)

        RoundResult.objects.filter(
            round__competition_category__competition=registration.competition,
            climber=registration.climber,
            deleted=False,
        ).update(deleted=True)

        registration.deleted = True
        registration.save()


def create_climber_for_user(admin_user, user_account_id: int) -> dict[str, Any]:
    from accounts.models import UserAccount

    try:
        user_account = UserAccount.objects.get(id=user_account_id)
    except UserAccount.DoesNotExist:
        raise ValueError(f"User account with id {user_account_id} not found")

    if Climber.objects.filter(user_account=user_account, deleted=False).exists():
        raise ValueError("User already has a climber")

    climber = Climber.objects.create(
        user_account=user_account,
        is_simple_athlete=False,
        created_by=admin_user,
        last_modified_by=admin_user,
    )

    age = (
        calculate_age(user_account.date_of_birth)
        if user_account.date_of_birth
        else None
    )

    return {
        "id": climber.pk,
        "is_simple_athlete": False,
        "user_account_id": user_account.pk,
        "name": user_account.full_name,
        "age": age,
        "gender": user_account.gender,
        "category": get_age_based_category(age) if age else None,
    }
