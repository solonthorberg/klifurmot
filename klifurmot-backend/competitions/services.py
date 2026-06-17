import logging
from datetime import datetime
from typing import Any, Dict, Optional, cast

from accounts.authorization import require_competition_admin
from athletes.models import CompetitionRegistration
from athletes.utils import (
    build_age_category_resolver,
    calculate_age,
)
from django.contrib.auth.models import User
from django.core.files.uploadedfile import UploadedFile
from django.db import transaction
from django.db.models import Count, Q
from core.images import compress_image
from scoring.models import Climb, ClimberRoundScore, RoundResult

from competitions.models import (
    CategoryGroup,
    Competition,
    CompetitionCategory,
    CompetitionRound,
    RoundGroup,
    Route,
)

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
    discipline: str = "boulder",
) -> Competition:
    if start_date >= end_date:
        raise ValueError("start_date must be before end_date")

    if image is not None:
        image = compress_image(image, max_size=(1200, 1200))

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
                discipline=discipline,
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
                setattr(competition, "image", None)
            elif image is not None:
                competition.image = compress_image(image, max_size=(1200, 1200))  # pyright: ignore[reportAttributeAccessIssue]

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
                route__round__competition_category__competition=competition,
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

            Route.objects.filter(
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
    queryset = Competition.objects.filter(deleted=False)

    if year:
        queryset = queryset.filter(start_date__year=year)

    queryset = queryset.order_by("-start_date").select_related("created_by")
    return list(queryset)


def list_public_competitions(year: Optional[int] = None) -> list[Competition]:
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
    require_competition_admin(user, competition_id)

    try:
        with transaction.atomic():
            category = CompetitionCategory.objects.select_related("competition").get(
                id=competition_category, deleted=False
            )

            if category.competition.pk != competition_id:
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

            route_count = round_data.get("route_count", 0)
            if route_count > 0:
                routes = [
                    Route(
                        round=competition_round,
                        route_number=i,
                        section_style="",
                        created_by=user,
                        last_modified_by=user,
                    )
                    for i in range(1, route_count + 1)
                ]
                Route.objects.bulk_create(routes)

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

            new_route_count = update_data.pop("route_count", None)
            if new_route_count is not None:
                current_route_count = (
                    cast(Any, competition_round).route_set.filter(deleted=False).count()
                )

                if new_route_count > current_route_count:
                    routes = [
                        Route(
                            round=competition_round,
                            route_number=i,
                            section_style="",
                            created_by=user,
                            last_modified_by=user,
                        )
                        for i in range(current_route_count + 1, new_route_count + 1)
                    ]
                    Route.objects.bulk_create(routes)

                elif new_route_count < current_route_count:
                    routes_to_delete = Route.objects.filter(
                        round=competition_round,
                        route_number__gt=new_route_count,
                        deleted=False,
                    )

                    Climb.objects.filter(
                        route__in=routes_to_delete,
                        deleted=False,
                    ).update(deleted=True)

                    routes_to_delete.update(deleted=True)

                competition_round.route_count = new_route_count

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


def delete_round(round_id: int, user) -> None:
    try:
        competition_round = CompetitionRound.objects.select_related(
            "competition_category__competition"
        ).get(id=round_id, deleted=False)
    except CompetitionRound.DoesNotExist:
        raise ValueError(f"Round with id {round_id} not found")

    competition = competition_round.competition_category.competition

    require_competition_admin(
        user,
        competition.id,
        message="You do not have permission to delete rounds in this competition",
    )

    if competition.status != "not_started":
        raise PermissionError("Cannot delete round after competition has started")

    with transaction.atomic():
        Climb.objects.filter(
            route__round=competition_round,
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

        Route.objects.filter(
            round=competition_round,
            deleted=False,
        ).update(deleted=True)

        competition_round.deleted = True
        competition_round.save()


def update_round_status(
    round_id: int,
    user: User,
    completed: bool,
) -> CompetitionRound:
    try:
        competition_round = CompetitionRound.objects.select_related(
            "competition_category"
        ).get(id=round_id, deleted=False)
    except CompetitionRound.DoesNotExist:
        raise ValueError(f"Round with id {round_id} not found")

    require_competition_admin(
        user, competition_round.competition_category.competition_id
    )

    is_reopening = competition_round.completed and not completed
    if is_reopening:
        next_round = (
            CompetitionRound.objects.filter(
                competition_category=competition_round.competition_category,
                round_order__gt=competition_round.round_order,
                deleted=False,
            )
            .order_by("round_order")
            .first()
        )

        if (
            next_round
            and RoundResult.objects.filter(round=next_round, deleted=False).exists()
        ):
            raise ValueError(
                "Cannot re-open this round: climbers have already been advanced to the next round. Remove them from the next round's start list first."
            )

    with transaction.atomic():
        competition_round.completed = completed
        competition_round.last_modified_by = user
        competition_round.save()

        return competition_round


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

    require_competition_admin(user, category.competition.pk)

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


def delete_category(category_id: int, user) -> None:
    try:
        category = CompetitionCategory.objects.select_related("competition").get(
            id=category_id, deleted=False
        )
    except CompetitionCategory.DoesNotExist:
        raise ValueError(f"Competition category with id {category_id} not found")

    require_competition_admin(
        user,
        category.competition.pk,
        message="You do not have permission to delete categories in this competition",
    )

    if category.competition.status != "not_started":
        raise PermissionError("Cannot delete category after competition has started")

    with transaction.atomic():
        Climb.objects.filter(
            route__round__competition_category=category,
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

        Route.objects.filter(
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


def get_competition_athletes(competition_id: int) -> Dict[str, Any]:
    try:
        competition = Competition.objects.get(id=competition_id, deleted=False)
    except Competition.DoesNotExist:
        raise ValueError(f"Competition with id {competition_id} not found")

    registrations = (
        CompetitionRegistration.objects.filter(
            competition_id=competition_id,
            deleted=False,
            climber__deleted=False,
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
                "id": climber.pk,
                "full_name": climber.simple_name,
                "age": climber.simple_age,
                "category_name": category.category_group.name,
            }
        else:
            user_account = climber.user_account
            athlete_data = {
                "id": climber.pk,
                "full_name": user_account.full_name if user_account else None,
                "age": calculate_age(user_account.date_of_birth)
                if user_account and user_account.date_of_birth
                else None,
                "category_name": category.category_group.name,
                "gender": user_account.gender if user_account else None,
                "nationality": user_account.nationality.country_code
                if user_account and user_account.nationality
                else None,
            }

        categories[category_label].append(athlete_data)

    return {
        "competition": competition.title,
        "categories": categories,
    }


def get_competition_routes(competition_id: int) -> list[Dict[str, Any]]:
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
            "competitionround_set__route_set",
        )
    )

    route_ids = Route.objects.filter(
        round__competition_category__competition_id=competition_id,
        deleted=False,
    ).values_list("id", flat=True)

    climb_stats = (
        Climb.objects.filter(route_id__in=route_ids, deleted=False)
        .values("route_id")
        .annotate(
            tops=Count("id", filter=Q(top_reached=True)),
            zones=Count("id", filter=Q(zone_reached=True)),
        )
    )

    stats_map = {stat["route_id"]: stat for stat in climb_stats}

    result = []

    for category in categories:
        category_label = f"{category.category_group.name} {category.gender}"
        rounds_data = []

        category_rounds = (
            cast(Any, category)
            .competitionround_set.filter(deleted=False)
            .order_by("round_order")
        )

        for competition_round in category_rounds:
            routes_data = []

            for route in competition_round.route_set.filter(deleted=False).order_by(
                "route_number"
            ):
                stats = stats_map.get(route.id, {"tops": 0, "zones": 0})

                routes_data.append(
                    {
                        "number": route.route_number,
                        "tops": stats["tops"],
                        "zones": stats["zones"],
                    }
                )

            rounds_data.append(
                {
                    "round_name": competition_round.round_group.name,
                    "routes": routes_data,
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

    category_for_age = build_age_category_resolver()

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
        for competition_round in (
            cast(Any, category)
            .competitionround_set.filter(deleted=False)
            .order_by("round_order")
        ):
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
                        "category_name": category_for_age(climber.get_age()),
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
    from scoring.services import _rank_climbers_in_round

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

        for round_obj in (
            cast(Any, category)
            .competitionround_set.filter(deleted=False)
            .order_by("round_order")
        ):
            routes = list(
                Route.objects.filter(round=round_obj, deleted=False).order_by(
                    "route_number"
                )
            )

            ranked = _rank_climbers_in_round(round_obj)

            if not ranked:
                rounds_data.append(
                    {
                        "round_name": round_obj.round_group.name,
                        "results": [],
                    }
                )
                continue

            climber_ids = [cid for cid, _, _ in ranked]

            climbs = (
                Climb.objects.filter(
                    route__round=round_obj,
                    climber_id__in=climber_ids,
                    deleted=False,
                )
                .select_related("route")
                .order_by("route__route_number")
            )

            climbs_by_climber: Dict[int, Dict[int, Climb]] = {}
            for climb in climbs:
                climbs_by_climber.setdefault(climb.climber.pk, {})[climb.route.pk] = (
                    climb
                )

            formatted_results = []
            for climber_id, score, rank in ranked:
                climber = score.climber

                if climber.is_simple_athlete:
                    full_name = climber.simple_name or "Name unknown"
                else:
                    full_name = (
                        climber.user_account.full_name
                        if climber.user_account
                        else "Name unknown"
                    )

                climber_climbs = climbs_by_climber.get(climber_id, {})
                route_scores = []

                for route in routes:
                    climb = climber_climbs.get(route.pk)
                    if climb:
                        route_scores.append(
                            {
                                "route_number": route.route_number,
                                "attempted": True,
                                "top_reached": climb.top_reached or False,
                                "zone_reached": climb.zone_reached or False,
                                "attempts_top": climb.attempts_top or 0,
                                "attempts_zone": climb.attempts_zone or 0,
                            }
                        )
                    else:
                        route_scores.append(
                            {
                                "route_number": route.route_number,
                                "attempted": False,
                                "top_reached": False,
                                "zone_reached": False,
                                "attempts_top": 0,
                                "attempts_zone": 0,
                            }
                        )

                formatted_results.append(
                    {
                        "rank": rank,
                        "full_name": full_name,
                        "tops": score.tops,
                        "attempts_top": score.attempts_tops,
                        "zones": score.zones,
                        "attempts_zone": score.attempts_zones,
                        "total_score": float(round(score.total_score, 1)),
                        "routes": route_scores,
                    }
                )

            rounds_data.append(
                {
                    "round_name": round_obj.round_group.name,
                    "results": formatted_results,
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


def get_route(route_id: int) -> dict[str, Any]:
    try:
        route = Route.objects.select_related(
            "round__competition_category__competition"
        ).get(id=route_id, deleted=False)
    except Route.DoesNotExist:
        raise ValueError(f"Route with id {route_id} not found")

    return {
        "id": route.pk,
        "route_number": route.route_number,
        "section_style": route.section_style,
        "image": route.image.url if route.image else None,
        "round_id": route.round.pk,
    }


def update_route(
    route_id: int,
    user,
    image=None,
    **update_data: Any,
) -> dict[str, Any]:
    try:
        route = Route.objects.select_related(
            "round__competition_category__competition"
        ).get(id=route_id, deleted=False)
    except Route.DoesNotExist:
        raise ValueError(f"Route with id {route_id} not found")

    competition = route.round.competition_category.competition

    if competition.status != "not_started":
        raise PermissionError("Cannot update route after competition has started")

    if image is not None:
        if image == "":
            if route.image:
                route.image.delete(save=False)
            setattr(route, "image", None)
        else:
            if route.image:
                route.image.delete(save=False)
            route.image = image

    for field, value in update_data.items():
        if hasattr(route, field):
            setattr(route, field, value)

    route.last_modified_by = user
    route.save()

    return {
        "id": route.pk,
        "route_number": route.route_number,
        "section_style": route.section_style,
        "image": route.image.url if route.image else None,
        "round_id": route.round.pk,
    }
