from typing import Optional

from django.db.models import Q
from django.utils.timezone import datetime

from athletes.models import Climber, CompetitionRegistration

from athletes.utils import (
    build_age_category_resolver,
    calculate_age,
    calculate_age_for_category,
    get_age_based_category,
)
from competitions.models import CompetitionRound
from scoring.models import RoundResult

from . import types


def public_athlete_list(
    search: Optional[str] = None,
) -> list[types.PublicAthleteResult]:
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
                "user_account_id": user_account.pk,
                "full_name": user_account.full_name or "Name not provided",
                "age": age,
                "gender": user_account.gender,
                "category": category_for_age(category_age),
                "nationality": user_account.nationality.country_code
                if user_account.nationality
                else None,
            }
        )

    return result


def public_athlete_detail_get(athlete_id: int) -> types.PublicAthleteDetailResult:
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
        competition__end_date__lt=datetime.now(),
    ).select_related("competition", "competition_category__category_group")

    participation_count = (
        RoundResult.objects.filter(
            climber=climber,
            deleted=False,
            round__competition_category__competition__end_date__lt=datetime.now(),
            round__deleted=False,
        )
        .values("round__competition_category__competition")
        .distinct()
        .count()
    )

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
        "user_account_id": user_account.pk,
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
        "competitions_count": participation_count,
        "wins_count": wins,
        "competition_results": competitions_result,
    }


def _get_climber_results(competition, climber) -> types.ClimberScoreResult | None:
    round_result = (
        RoundResult.objects.filter(
            round__competition_category__competition=competition,
            round__deleted=False,
            climber=climber,
            deleted=False,
        )
        .select_related("round", "round__round_group")
        .order_by("-round__round_order")
        .first()
    )

    if round_result is None:
        return None

    return {
        "round_name": round_result.round.round_group.name,
        "round_order": round_result.round.round_order,
        "rank": round_result.rank,
    }


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


def climber_list(search: Optional[str] = None) -> list[types.ClimberResult]:
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
                types.SimpleClimberResult(
                    id=climber.pk,
                    is_simple_athlete=True,
                    full_name=climber.simple_name or "Name not provided",
                    age=climber.simple_age,
                    gender=climber.simple_gender,
                    category=get_age_based_category(climber.simple_age)
                    if climber.simple_age
                    else None,
                )
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
                types.LinkedClimberResult(
                    id=climber.pk,
                    is_simple_athlete=False,
                    user_account_id=user_account.id,
                    full_name=user_account.full_name or "Name not provided",
                    age=age,
                    gender=user_account.gender,
                    category=get_age_based_category(category_age) if age else None,
                    nationality=user_account.nationality.country_code
                    if user_account.nationality
                    else None,
                )
            )

    return result


def climber_get(climber_id: int) -> types.ClimberResult:
    try:
        climber = Climber.objects.select_related("user_account__nationality").get(
            id=climber_id, deleted=False
        )
    except Climber.DoesNotExist:
        raise ValueError(f"Climber with id {climber_id} not found")

    if climber.is_simple_athlete:
        return types.SimpleClimberResult(
            id=climber.pk,
            is_simple_athlete=True,
            full_name=climber.simple_name or "Name not provided",
            age=climber.simple_age,
            gender=climber.simple_gender,
            category=get_age_based_category(climber.simple_age)
            if climber.simple_age
            else None,
        )

    user_account = climber.user_account

    if not user_account:
        raise ValueError(f"Climber with id {climber_id} not found")

    age = (
        calculate_age_for_category(user_account.date_of_birth)
        if user_account.date_of_birth
        else None
    )

    return types.LinkedClimberResult(
        id=climber.pk,
        is_simple_athlete=False,
        user_account_id=user_account.pk,
        full_name=user_account.full_name or "Name not provided",
        age=age,
        gender=user_account.gender,
        category=get_age_based_category(age) if age else None,
        nationality=user_account.nationality.country_code
        if user_account.nationality
        else None,
    )


def registration_list(
    competition_id: Optional[int] = None,
) -> list[types.RegistrationResult]:
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
            types.RegistrationResult(
                id=reg.pk,
                climber_id=climber.pk,
                climber_name=climber_name,
                competition_id=reg.competition.pk,
                competition_title=reg.competition.title,
                category=f"{reg.competition_category.category_group.name} {reg.competition_category.gender}",
            )
        )

    return result
