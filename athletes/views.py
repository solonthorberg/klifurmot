from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS
from .models import Climber, CompetitionRegistration
from .serializers import ClimberSerializer, CompetitionRegistrationSerializer
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from datetime import date

from accounts.models import UserAccount
from athletes.models import CompetitionRegistration
from scoring.models import RoundResult



class ClimberViewSet(viewsets.ModelViewSet):
    queryset = Climber.objects.all()
    serializer_class = ClimberSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Climber.objects.all()

class CompetitionRegistrationViewSet(viewsets.ModelViewSet):
    queryset = CompetitionRegistration.objects.all()
    serializer_class = CompetitionRegistrationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = CompetitionRegistration.objects.all()
        competition = self.request.query_params.get("competition")
        climber = self.request.query_params.get("climber")
        if competition:
            qs = qs.filter(competition_id=competition)
        if climber:
            qs = qs.filter(climber_id=climber)
        return qs
    
CATEGORY_LABELS = {
    "U11": "11 ára og yngri",
    "U13": "13 ára og yngri",
    "U15": "15 ára og yngri",
    "U17": "17 ára og yngri",
    "U19": "19 ára og yngri",
    "U21": "21 árs og yngri",
    "Opinn": "Opinn flokkur"
}

GENDER_LABELS = {
    "KK": "KK",
    "KVK": "KVK"
}

def calculate_age(birth_date):
    today = date.today()
    age = today.year - birth_date.year
    if (today.month, today.day) < (birth_date.month, birth_date.day):
        age -= 1
    return age

def get_age_based_category(age):
    if age <= 11:
        return "U11"
    elif age <= 13:
        return "U13"
    elif age <= 15:
        return "U15"
    elif age <= 17:
        return "U17"
    elif age <= 19:
        return "U19"
    elif age <= 21:
        return "U21"
    else:
        return "Opinn"

@api_view(["GET"])
@permission_classes([AllowAny])
def AthleteDetail(request, pk):
    athlete = get_object_or_404(UserAccount, pk=pk)

    age = calculate_age(athlete.date_of_birth)
    group_name = get_age_based_category(age)
    gender = athlete.gender
    category = f"{CATEGORY_LABELS[group_name]} {GENDER_LABELS.get(gender, gender)}"

    registrations = CompetitionRegistration.objects.filter(climber__user_account=athlete).select_related(
        "competition", "competition_category__category_group"
    )

    competitions = [
        {
            "id": reg.competition.id,
            "title": reg.competition.title,
            "category": f"{CATEGORY_LABELS.get(reg.competition_category.category_group.name)} {GENDER_LABELS.get(reg.competition_category.gender)}",
            "start_date": reg.competition.start_date
        }
        for reg in registrations
    ]

    wins = RoundResult.objects.filter(climber__user_account=athlete, rank=1).count()

    return Response({
        "id": athlete.id,
        "full_name": athlete.user.get_full_name(),
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