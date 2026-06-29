from competitions.models import Competition, CompetitionCategory

from . import types
from typing import Any, cast

from accounts.authorization import require_competition_admin
from accounts.models import UserAccount
from django.db import transaction

from scoring.models import Climb, ClimberRoundScore, RoundResult
from .models import Climber, CompetitionRegistration
from .utils import (
    calculate_age,
    get_age_based_category,
)


def create_climber(user, **data: Any) -> types.SimpleClimberResult:
    climber = Climber.objects.create(
        simple_name=data["name"],
        simple_age=data["age"],
        simple_gender=data["gender"],
        is_simple_athlete=True,
        created_by=user,
        last_modified_by=user,
    )

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


def update_climber(
    climber_id: int, user, **update_data: Any
) -> types.SimpleClimberResult:
    try:
        climber = Climber.objects.get(id=climber_id, deleted=False)
    except Climber.DoesNotExist:
        raise ValueError(f"Climber with id {climber_id} not found")

    if not climber.is_simple_athlete:
        raise ValueError(
            "Cannot update linked athletes directly. User account needs to be updated"
        )

    if "name" in update_data:
        climber.simple_name = update_data["name"]

    if "age" in update_data:
        climber.simple_age = update_data["age"]

    if "gender" in update_data:
        climber.simple_gender = update_data["gender"]

    climber.last_modified_by = user
    climber.save()

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


def delete_climber(climber_id: int) -> None:
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


def link_climber(user, climber_id: int, user_account_id: int) -> None:
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


def create_registration(user, **data: Any) -> types.RegistrationResult:

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

    return types.RegistrationResult(
        id=registration.pk,
        climber_id=climber.pk,
        climber_name=climber_name,
        competition_id=competition.pk,
        competition_title=competition.title,
        category=f"{category.category_group.name} {category.gender}",
    )


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


def create_climber_for_user(
    admin_user, user_account_id: int
) -> types.LinkedClimberResult:
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
