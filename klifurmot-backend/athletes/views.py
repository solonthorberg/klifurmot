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

    def _add_age_data(self, climber_data):
        if 'user_account' in climber_data and climber_data['user_account']:
            user_account = climber_data['user_account']
            if 'date_of_birth' in user_account and user_account['date_of_birth']:
                birth_date_str = user_account['date_of_birth']
                birth_date = date.fromisoformat(birth_date_str) if isinstance(birth_date_str, str) else birth_date_str
                age = calculate_age(birth_date)
                
                user_account['age'] = age
                if age is not None:
                    user_account['age_category'] = get_age_based_category(age)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data
        self._add_age_data(data)
        return Response(data)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            data = serializer.data
            for climber_data in data:
                self._add_age_data(climber_data)
            return self.get_paginated_response(data)

        serializer = self.get_serializer(queryset, many=True)
        data = serializer.data
        for climber_data in data:
            self._add_age_data(climber_data)
        return Response(data)


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
                "round_order": round.round_order,
                "rank": latest_rank,
            })

    return climber_results

def CalculateWins(competition, climber):
    rounds = CompetitionRound.objects.filter(
        competition_category__competition=competition
    )

    final_round = rounds.order_by('-round_order').first()
    if not final_round:
        return 0

    final_result = RoundResult.objects.filter(
        round=final_round, climber=climber
    ).first()

    if final_result and final_result.rank == 1:
        return 1

    return 0

        

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

    registrations = CompetitionRegistration.objects.filter(
        climber=climber
    ).select_related("competition", "competition_category__category_group")

    competitions_result = []
    for reg in registrations:
        results = GetResultsForClimbers(reg.competition, climber)
        competitions_result.append({
            "id": reg.competition.id,
            "title": reg.competition.title,
            "category": f"{CATEGORY_LABELS.get(reg.competition_category.category_group.name, reg.competition_category.category_group.name)} {GENDER_LABELS.get(reg.competition_category.gender, reg.competition_category.gender)}",
            "start_date": reg.competition.start_date,
            "results": results
        })

    wins = sum(CalculateWins(reg.competition, climber) for reg in registrations)

    return Response({
        "id": athlete.id,
        "full_name": athlete.full_name,
        "age": age,
        "height_cm": athlete.height_cm,
        "wingspan_cm": athlete.wingspan_cm,
        "gender": athlete.gender,
        "nationality": athlete.nationality.name_local if athlete.nationality else "–",
        "category": category,
        "profile_picture": athlete.profile_picture.url if athlete.profile_picture else None,
        "competitions_count": registrations.count(),
        "wins_count": wins,
        "competition_results": competitions_result
    })

