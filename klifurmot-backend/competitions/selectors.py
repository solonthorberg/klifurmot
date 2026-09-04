from typing import Any, Dict, Optional, cast

from django.db.models import Q, Count

from athletes.models import Climber, CompetitionRegistration
from athletes.utils import build_age_category_resolver, calculate_age
from competitions.models import (
    CategoryGroup,
    Competition,
    CompetitionCategory,
    CompetitionRound,
    RoundGroup,
    Route,
)
from scoring.models import Climb, RoundResult
from . import types
from scoring.selectors import rank_climbers_in_round


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


def get_competition_athletes(competition_id: int) -> types.CompetitionAthletesResult:
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
            athlete_data = Climber(
                id=climber.pk,
                full_name=climber.simple_name,
                age=climber.simple_age,
                category_name=category.category_group.name,
            )
        else:
            user_account = climber.user_account
            athlete_data = Climber(
                id=climber.pk,
                full_name=user_account.full_name if user_account else None,
                age=calculate_age(user_account.date_of_birth)
                if user_account and user_account.date_of_birth
                else None,
                category_name=category.category_group.name,
                gender=user_account.gender if user_account else None,
                nationality=user_account.nationality.country_code
                if user_account and user_account.nationality
                else None,
            )

        categories[category_label].append(athlete_data)

    return types.CompetitionAthletesResult(
        competition=competition.title,
        categories=categories,
    )


def get_competition_routes(competition_id: int) -> list[types.CompetitionRoute]:
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
                    types.RouteInfo(
                        number=route.route_number,
                        tops=stats["tops"],
                        zones=stats["zones"],
                    )
                )

            rounds_data.append(
                types.RoundDataRoute(
                    round_name=competition_round.round_group.name,
                    routes=routes_data,
                )
            )

        result.append(
            types.CompetitionRoute(
                category=category_label,
                rounds=rounds_data,
            )
        )

    return result


def get_competition_startlist(competition_id: int) -> list[types.CompetitionStartlist]:
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
                    types.AthleteInfo(
                        start_order=round_result.start_order,
                        full_name=full_name,
                        category_name=category_for_age(climber.get_age()),
                    )
                )
            rounds_data.append(
                types.RoundDataStartlist(
                    round_name=competition_round.round_group.name,
                    athletes=athletes_data,
                )
            )
        result.append(
            types.CompetitionStartlist(
                category=category_label,
                rounds=rounds_data,
            )
        )
    return result


def get_competition_results(competition_id: int) -> list[types.CompetitionResult]:
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

            ranked = rank_climbers_in_round(round_obj)

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
                            types.RouteScore(
                                route_number=route.route_number,
                                attempted=True,
                                top_reached=climb.top_reached or False,
                                zone_reached=climb.zone_reached or False,
                                attempts_top=climb.attempts_top or 0,
                                attempts_zone=climb.attempts_zone or 0,
                            )
                        )
                    else:
                        route_scores.append(
                            types.RouteScore(
                                route_number=route.route_number,
                                attempted=False,
                                top_reached=False,
                                zone_reached=False,
                                attempts_top=0,
                                attempts_zone=0,
                            )
                        )

                formatted_results.append(
                    types.ClimberResult(
                        rank=rank,
                        full_name=full_name,
                        tops=score.tops,
                        attempts_top=score.attempts_tops,
                        zones=score.zones,
                        attempts_zone=score.attempts_zones,
                        total_score=float(round(score.total_score, 1)),
                        routes=route_scores,
                    )
                )

            rounds_data.append(
                {
                    "round_name": round_obj.round_group.name,
                    "results": formatted_results,
                }
            )

        result.append(
            types.CompetitionResult(
                category=category_label,
                rounds=rounds_data,
            )
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


def get_route(route_id: int) -> Route:
    try:
        route = Route.objects.select_related(
            "round__competition_category__competition"
        ).get(id=route_id, deleted=False)
    except Route.DoesNotExist:
        raise ValueError(f"Route with id {route_id} not found")

    return Route(
        id=route.pk,
        route_number=route.route_number,
        section_style=route.section_style,
        image=route.image.url if route.image else None,
        round_id=route.round.pk,
    )
