# climbers/views.py
from datetime import date
from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .models import Climber, CompetitionRegistration
from .serializers import ClimberSerializer, CompetitionRegistrationSerializer
from accounts.models import UserAccount
from scoring.models import RoundResult
from competitions.models import CompetitionRound
from .utils import calculate_age, get_age_based_category, CATEGORY_LABELS, GENDER_LABELS


class GetClimberViewSet(viewsets.ModelViewSet):
    queryset = Climber.objects.all()
    serializer_class = ClimberSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class CompetitionRegistrationViewSet(viewsets.ModelViewSet):
    queryset = CompetitionRegistration.objects.all()
    serializer_class = CompetitionRegistrationSerializer
    permission_classes = [AllowAny]


def GetResultsForClimbers(competition, climber):
    rounds = CompetitionRound.objects.filter(
        competition_category__competition=competition
    ).select_related("round_group").order_by('-round_order')

    climber_results = []
    latest_rank = None

    for round in rounds:
        round_result = RoundResult.objects.filter(round=round, climber=climber).first()
        if round_result:
            if latest_rank is None:
                latest_rank = round_result.rank

            climber_results.append({
                "round_name": round.round_group.name,
                "rank": latest_rank,
            })

    return climber_results


@api_view(["GET"])
@permission_classes([AllowAny])
def GetAthleteDetail(request, pk):
    athlete = get_object_or_404(UserAccount, pk=pk)
    climber = getattr(athlete, "climber", None)
    if not climber:
        return Response({"detail": "Climber profile not found."}, status=404)

    age = calculate_age(athlete.date_of_birth)
    group_name = get_age_based_category(age)
    gender = athlete.gender
    category = f"{CATEGORY_LABELS.get(group_name, group_name)} {GENDER_LABELS.get(gender, gender)}"

    registrations = CompetitionRegistration.objects.filter(climber=climber).select_related("competition", "competition_category__category_group")

    competitions = []
    for reg in registrations:
        results = GetResultsForClimbers(reg.competition, climber)
        competitions.append({
            "id": reg.competition.id,
            "title": reg.competition.title,
            "category": f"{CATEGORY_LABELS.get(reg.competition_category.category_group.name, reg.competition_category.category_group.name)} {GENDER_LABELS.get(reg.competition_category.gender, reg.competition_category.gender)}",
            "start_date": reg.competition.start_date,
            "results": results
        })

    wins = RoundResult.objects.filter(climber=climber, rank=1).count()

    return Response({
        "id": athlete.id,
        "full_name": athlete.full_name,
        "date_of_birth": athlete.date_of_birth,
        "height_cm": athlete.height_cm,
        "wingspan_cm": athlete.wingspan_cm,
        "gender": athlete.gender,
        "nationality": athlete.nationality.name_local if athlete.nationality else "–",
        "category": category,
        "competitions_count": registrations.count(),
        "wins_count": wins,
        "competitions": competitions
    })
