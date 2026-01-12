from datetime import datetime
import logging
from typing import Any, Dict, Optional
from django.contrib.auth.models import User
from django.db import transaction
from django.core.files.uploadedfile import UploadedFile
from django.db.models import Count, Q

from athletes.utils import calculate_age
from competitions.models import (
    Competition,
    CompetitionCategory,
    CompetitionRound,
    RoundGroup,
    CategoryGroup,
    Boulder,
)

from athletes.models import CompetitionRegistration
from scoring.models import Climb, RoundResult, ClimberRoundScore


logger = logging.getLogger(__name__)


def create_competition(
    title: str,
    description: str,
    start_date: datetime,
    end_date: datetime,
    location: str,
    created_by: User,
    image: Optional[UploadedFile] = None,
    visible: bool = True,
) -> Competition:
    if start_date >= end_date:
        raise ValueError("start_date must be before end_date")

    try:
        with transaction.atomic():
            competition = Competition.objects.create(
                title=title,
                description=description,
                start_date=start_date,
                end_date=end_date,
                location=location,
                image=image,
                visible=visible,
                created_by=created_by,
                last_modified_by=created_by,
            )
            return competition

    except Exception as e:
        logger.error(f"Failed to create competition: {str(e)}")
        raise


def update_competition(
    competition_id: int,
    user: User,
    **update_data: Any,
) -> Competition:
    try:
        with transaction.atomic():
            competition = Competition.objects.get(id=competition_id, deleted=False)

            remove_image = update_data.pop("remove_image", False)
            image = update_data.pop("image", None)

            if remove_image:
                if competition.image:
                    competition.image.delete(save=False)
                competition.image = None
            elif image is not None:
                competition.image = image

            for field, value in update_data.items():
                if hasattr(competition, field):
                    setattr(competition, field, value)

            competition.last_modified_by = user
            competition.save()

            return competition

    except Competition.DoesNotExist:
        raise ValueError(f"Competition with id {competition_id} not found")


def delete_competition(competition_id: int) -> None:
    try:
        competition = Competition.objects.get(id=competition_id, deleted=False)

        with transaction.atomic():
            Climb.objects.filter(
                boulder__round__competition_category__competition=competition,
                deleted=False,
            ).update(deleted=True)

            ClimberRoundScore.objects.filter(
                round__competition_category__competition=competition,
                deleted=False,
            ).update(deleted=True)

            RoundResult.objects.filter(
                round__competition_category__competition=competition,
                deleted=False,
            ).update(deleted=True)

            Boulder.objects.filter(
                round__competition_category__competition=competition,
                deleted=False,
            ).update(deleted=True)

            CompetitionRound.objects.filter(
                competition_category__competition=competition,
                deleted=False,
            ).update(deleted=True)

            CompetitionCategory.objects.filter(
                competition=competition,
                deleted=False,
            ).update(deleted=True)

            CompetitionRegistration.objects.filter(
                competition=competition,
                deleted=False,
            ).update(deleted=True)

            competition.deleted = True
            competition.save()

    except Competition.DoesNotExist:
        raise ValueError(f"Competition with id {competition_id} not found")


def get_competition(competition_id: int) -> Competition:
    try:
        return Competition.objects.get(id=competition_id, deleted=False)

    except Competition.DoesNotExist:
        raise ValueError(f"Competition with id {competition_id} not found")


def list_competitions(year: Optional[int] = None) -> list[Competition]:
    queryset = Competition.objects.filter(visible=True, deleted=False)

    if year:
        queryset = queryset.filter(start_date__year=year)

    return list(queryset.order_by("-start_date"))


def create_round(
    competition_id: int,
    user: User,
    competition_category: int,
    round_group: int,
    **round_data: Any,
) -> CompetitionRound:
    try:
        with transaction.atomic():
            category = CompetitionCategory.objects.select_related("competition").get(
                id=competition_category, deleted=False
            )

            if category.competition_id != competition_id:
                raise ValueError("Category does not belong to this competition")

            if category.competition.status != "not_started":
                raise PermissionError("Cannot add round after competition has started")

            group = RoundGroup.objects.get(id=round_group)

            competition_round = CompetitionRound.objects.create(
                competition_category=category,
                round_group=group,
                created_by=user,
                last_modified_by=user,
                **round_data,
            )

            boulder_count = round_data.get("boulder_count", 0)
            if boulder_count > 0:
                boulders = [
                    Boulder(
                        round=competition_round,
                        boulder_number=i,
                        section_style="",
                        created_by=user,
                        last_modified_by=user,
                    )
                    for i in range(1, boulder_count + 1)
                ]
                Boulder.objects.bulk_create(boulders)

            return competition_round

    except CompetitionCategory.DoesNotExist:
        raise ValueError(
            f"Competition category with id {competition_category} not found"
        )

    except RoundGroup.DoesNotExist:
        raise ValueError(f"Round group with id {round_group} not found")


def update_round(
    round_id: int,
    user: User,
    **update_data: Any,
) -> CompetitionRound:
    try:
        with transaction.atomic():
            competition_round = CompetitionRound.objects.select_related(
                "competition_category__competition"
            ).get(id=round_id, deleted=False)

            competition = competition_round.competition_category.competition

            if competition.status != "not_started":
                raise PermissionError(
                    "Cannot update round after competition has started"
                )

            round_group_id = update_data.pop("round_group", None)
            if round_group_id is not None:
                round_group = RoundGroup.objects.get(id=round_group_id)
                competition_round.round_group = round_group

            new_boulder_count = update_data.pop("boulder_count", None)
            if new_boulder_count is not None:
                current_boulder_count = competition_round.boulder_set.filter(
                    deleted=False
                ).count()

                if new_boulder_count > current_boulder_count:
                    boulders = [
                        Boulder(
                            round=competition_round,
                            boulder_number=i,
                            section_style="",
                            created_by=user,
                            last_modified_by=user,
                        )
                        for i in range(current_boulder_count + 1, new_boulder_count + 1)
                    ]
                    Boulder.objects.bulk_create(boulders)

                elif new_boulder_count < current_boulder_count:
                    boulders_to_delete = Boulder.objects.filter(
                        round=competition_round,
                        boulder_number__gt=new_boulder_count,
                        deleted=False,
                    )

                    Climb.objects.filter(
                        boulder__in=boulders_to_delete,
                        deleted=False,
                    ).update(deleted=True)

                    boulders_to_delete.update(deleted=True)

                competition_round.boulder_count = new_boulder_count

            for field, value in update_data.items():
                if hasattr(competition_round, field):
                    setattr(competition_round, field, value)

            competition_round.last_modified_by = user
            competition_round.save()

            return competition_round

    except CompetitionRound.DoesNotExist:
        raise ValueError(f"Round with id {round_id} not found")

    except RoundGroup.DoesNotExist:
        raise ValueError(f"Round group with id {round_group_id} not found")


def delete_round(round_id: int) -> None:
    try:
        competition_round = CompetitionRound.objects.select_related(
            "competition_category__competition"
        ).get(id=round_id, deleted=False)

        competition = competition_round.competition_category.competition

        if competition.status != "not_started":
            raise PermissionError("Cannot delete round after competition has started")

        with transaction.atomic():
            Climb.objects.filter(
                boulder__round=competition_round,
                deleted=False,
            ).update(deleted=True)

            ClimberRoundScore.objects.filter(
                round=competition_round,
                deleted=False,
            ).update(deleted=True)

            RoundResult.objects.filter(
                round=competition_round,
                deleted=False,
            ).update(deleted=True)

            Boulder.objects.filter(
                round=competition_round,
                deleted=False,
            ).update(deleted=True)

            competition_round.deleted = True
            competition_round.save()

    except CompetitionRound.DoesNotExist:
        raise ValueError(f"Round with id {round_id} not found")


def update_round_status(
    round_id: int,
    user: User,
    completed: bool,
) -> CompetitionRound:
    try:
        with transaction.atomic():
            competition_round = CompetitionRound.objects.get(id=round_id, deleted=False)

            competition_round.completed = completed
            competition_round.last_modified_by = user
            competition_round.save()

            return competition_round

    except CompetitionRound.DoesNotExist:
        raise ValueError(f"Round with id {round_id} not found")


def list_rounds(competition_id: int) -> list[CompetitionRound]:
    return list(
        CompetitionRound.objects.filter(
            competition_category__competition_id=competition_id, deleted=False
        )
        .select_related("competition_category", "round_group")
        .order_by("competition_category", "round_order")
    )


def list_round_groups() -> list[RoundGroup]:
    return list(RoundGroup.objects.all().order_by("name"))


def list_categories(competition_id: int) -> list[CompetitionCategory]:
    return list(
        CompetitionCategory.objects.filter(competition_id=competition_id, deleted=False)
        .select_related("category_group")
        .order_by("category_group__name", "gender")
    )


def list_category_groups() -> list[CategoryGroup]:
    return list(CategoryGroup.objects.all().order_by("min_age"))


def create_category(
    competition_id: int,
    category_group_id: int,
    gender: str,
    user: User,
) -> CompetitionCategory:
    try:
        competition = Competition.objects.get(id=competition_id, deleted=False)
    except Competition.DoesNotExist:
        raise ValueError(f"Competition with id {competition_id} not found")

    if competition.status != "not_started":
        raise PermissionError("Cannot add category after competition has started")

    try:
        category_group = CategoryGroup.objects.get(id=category_group_id)
    except CategoryGroup.DoesNotExist:
        raise ValueError(f"Category group with id {category_group_id} not found")

    with transaction.atomic():
        existing = CompetitionCategory.objects.filter(
            competition=competition,
            category_group=category_group,
            gender=gender,
            deleted=False,
        ).exists()

        if existing:
            raise ValueError("This category already exists for this competition")

        return CompetitionCategory.objects.create(
            competition=competition,
            category_group=category_group,
            gender=gender,
            created_by=user,
            last_modified_by=user,
        )


def update_category(
    category_id: int,
    user: User,
    **update_data: Any,
) -> CompetitionCategory:
    try:
        category = CompetitionCategory.objects.select_related("competition").get(
            id=category_id, deleted=False
        )
    except CompetitionCategory.DoesNotExist:
        raise ValueError(f"Competition category with id {category_id} not found")

    if category.competition.status != "not_started":
        raise PermissionError("Cannot update category after competition has started")

    with transaction.atomic():
        category_group_id = update_data.pop("category_group", None)
        if category_group_id is not None:
            try:
                category_group = CategoryGroup.objects.get(id=category_group_id)
                category.category_group = category_group
            except CategoryGroup.DoesNotExist:
                raise ValueError(
                    f"Category group with id {category_group_id} not found"
                )

        for field, value in update_data.items():
            if hasattr(category, field):
                setattr(category, field, value)

        existing = (
            CompetitionCategory.objects.filter(
                competition=category.competition,
                category_group=category.category_group,
                gender=category.gender,
                deleted=False,
            )
            .exclude(id=category_id)
            .exists()
        )

        if existing:
            raise ValueError("This category already exists for this competition")

        category.last_modified_by = user
        category.save()

    return category


def delete_category(category_id: int) -> None:
    try:
        category = CompetitionCategory.objects.select_related("competition").get(
            id=category_id, deleted=False
        )

        if category.competition.status != "not_started":
            raise PermissionError(
                "Cannot delete category after competition has started"
            )

        with transaction.atomic():
            Climb.objects.filter(
                boulder__round__competition_category=category,
                deleted=False,
            ).update(deleted=True)

            ClimberRoundScore.objects.filter(
                round__competition_category=category,
                deleted=False,
            ).update(deleted=True)

            RoundResult.objects.filter(
                round__competition_category=category,
                deleted=False,
            ).update(deleted=True)

            Boulder.objects.filter(
                round__competition_category=category,
                deleted=False,
            ).update(deleted=True)

            CompetitionRound.objects.filter(
                competition_category=category,
                deleted=False,
            ).update(deleted=True)

            CompetitionRegistration.objects.filter(
                competition_category=category,
                deleted=False,
            ).update(deleted=True)

            category.deleted = True
            category.save()

    except CompetitionCategory.DoesNotExist:
        raise ValueError(f"Competition category with id {category_id} not found")


def get_competition_athletes(competition_id: int) -> Dict[str, Any]:
    try:
        competition = Competition.objects.get(id=competition_id, deleted=False)
    except Competition.DoesNotExist:
        raise ValueError(f"Competition with id {competition_id} not found")

    registrations = (
        CompetitionRegistration.objects.filter(
            competition_id=competition_id,
            deleted=False,
        )
        .select_related(
            "climber__user_account",
            "competition_category__category_group",
        )
        .order_by(
            "competition_category__category_group__name",
            "competition_category__gender",
        )
    )

    categories: Dict[str, list] = {}

    for reg in registrations:
        category = reg.competition_category
        category_label = f"{category.category_group.name} {category.gender}"

        if category_label not in categories:
            categories[category_label] = []

        climber = reg.climber

        if climber.is_simple_athlete:
            athlete_data = {
                "id": climber.id,
                "full_name": climber.simple_name,
                "age": climber.simple_age,
                "category_name": category_label,
            }
        else:
            user_account = climber.user_account
            athlete_data = {
                "id": climber.id,
                "full_name": user_account.full_name if user_account else None,
                "age": calculate_age(user_account.date_of_birth)
                if user_account and user_account.date_of_birth
                else None,
                "category_name": category_label,
            }

        categories[category_label].append(athlete_data)

    return {
        "competition": competition.title,
        "categories": categories,
    }


def get_competition_boulders(competition_id: int) -> list[Dict[str, Any]]:
    if not Competition.objects.filter(id=competition_id, deleted=False).exists():
        raise ValueError(f"Competition with id {competition_id} not found")

    categories = (
        CompetitionCategory.objects.filter(
            competition_id=competition_id,
            deleted=False,
        )
        .select_related("category_group")
        .prefetch_related(
            "competitionround_set__round_group",
            "competitionround_set__boulder_set",
        )
    )

    boulder_ids = Boulder.objects.filter(
        round__competition_category__competition_id=competition_id,
        deleted=False,
    ).values_list("id", flat=True)

    climb_stats = (
        Climb.objects.filter(boulder_id__in=boulder_ids, deleted=False)
        .values("boulder_id")
        .annotate(
            tops=Count("id", filter=Q(top_reached=True)),
            zones=Count("id", filter=Q(zone_reached=True)),
        )
    )

    stats_map = {stat["boulder_id"]: stat for stat in climb_stats}

    result = []

    for category in categories:
        category_label = f"{category.category_group.name} {category.gender}"
        rounds_data = []

        for competition_round in category.competitionround_set.filter(
            deleted=False
        ).order_by("round_order"):
            boulders_data = []

            for boulder in competition_round.boulder_set.filter(deleted=False).order_by(
                "boulder_number"
            ):
                stats = stats_map.get(boulder.id, {"tops": 0, "zones": 0})

                boulders_data.append(
                    {
                        "number": boulder.boulder_number,
                        "tops": stats["tops"],
                        "zones": stats["zones"],
                    }
                )

            rounds_data.append(
                {
                    "round_name": competition_round.round_group.name,
                    "boulders": boulders_data,
                }
            )

        result.append(
            {
                "category": category_label,
                "rounds": rounds_data,
            }
        )

    return result


def get_competition_startlist(competition_id: int) -> list[Dict[str, Any]]:
    if not Competition.objects.filter(id=competition_id, deleted=False).exists():
        raise ValueError(f"Competition with id {competition_id} not found")

    categories = (
        CompetitionCategory.objects.filter(
            competition_id=competition_id,
            deleted=False,
        )
        .select_related("category_group")
        .prefetch_related("competitionround_set__round_group")
    )

    result = []

    for category in categories:
        category_label = f"{category.category_group.name} {category.gender}"
        rounds_data = []

        for competition_round in category.competitionround_set.filter(
            deleted=False
        ).order_by("round_order"):
            round_results = (
                RoundResult.objects.filter(
                    round=competition_round,
                    deleted=False,
                )
                .select_related("climber__user_account")
                .order_by("start_order")
            )

            athletes_data = []

            for round_result in round_results:
                climber = round_result.climber

                if climber.is_simple_athlete:
                    full_name = climber.simple_name
                else:
                    full_name = (
                        climber.user_account.full_name if climber.user_account else None
                    )

                athletes_data.append(
                    {
                        "start_order": round_result.start_order,
                        "full_name": full_name,
                        "age_category": category.category_group.name,
                    }
                )

            rounds_data.append(
                {
                    "round_name": competition_round.round_group.name,
                    "athletes": athletes_data,
                }
            )

        result.append(
            {
                "category": category_label,
                "rounds": rounds_data,
            }
        )

    return result


def get_competition_results(competition_id: int) -> list[Dict[str, Any]]:
    if not Competition.objects.filter(id=competition_id, deleted=False).exists():
        raise ValueError(f"Competition with id {competition_id} not found")

    categories = (
        CompetitionCategory.objects.filter(
            competition_id=competition_id,
            deleted=False,
        )
        .select_related("category_group")
        .prefetch_related("competitionround_set__round_group")
    )

    result = []

    for category in categories:
        category_label = f"{category.category_group.name} {category.gender}"
        rounds_data = []

        for competition_round in category.competitionround_set.filter(
            deleted=False
        ).order_by("round_order"):
            scores = (
                ClimberRoundScore.objects.filter(round=competition_round, deleted=False)
                .select_related("climber__user_account")
                .order_by(
                    "-total_score", "-tops", "-zones", "attempts_tops", "attempts_zones"
                )
            )

            results_data = []
            current_rank = 0
            previous_score = None

            for index, score in enumerate(scores):
                if previous_score is None or (
                    score.total_score != previous_score.total_score
                    or score.tops != previous_score.tops
                    or score.zones != previous_score.zones
                    or score.attempts_tops != previous_score.attempts_tops
                    or score.attempts_zones != previous_score.attempts_zones
                ):
                    current_rank = index + 1

                climber = score.climber

                if climber.is_simple_athlete:
                    full_name = climber.simple_name
                else:
                    full_name = (
                        climber.user_account.full_name if climber.user_account else None
                    )

                results_data.append(
                    {
                        "rank": current_rank,
                        "climber_id": climber.id,
                        "full_name": full_name,
                        "tops": score.tops,
                        "zones": score.zones,
                        "attempts_tops": score.attempts_tops,
                        "attempts_zones": score.attempts_zones,
                        "total_score": float(score.total_score),
                    }
                )

                previous_score = score

            rounds_data.append(
                {
                    "round_name": competition_round.round_group.name,
                    "results": results_data,
                }
            )

        result.append(
            {
                "category": category_label,
                "rounds": rounds_data,
            }
        )

    return result


def get_round(round_id: int) -> CompetitionRound:
    try:
        return CompetitionRound.objects.select_related(
            "competition_category__competition",
            "competition_category__category_group",
            "round_group",
        ).get(id=round_id, deleted=False)

    except CompetitionRound.DoesNotExist:
        raise ValueError(f"Round with id {round_id} not found")
