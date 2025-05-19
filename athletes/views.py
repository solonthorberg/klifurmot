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
from scoring.models import RoundResult, Climb




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
    
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from datetime import date
from .models import Climber, CompetitionRegistration
from scoring.models import RoundResult, Climb
from competitions.models import Round
from accounts.models import UserAccount

# Helper function to calculate age
def calculate_age(birth_date):
    today = date.today()
    age = today.year - birth_date.year
    if (today.month, today.day) < (birth_date.month, birth_date.day):
        age -= 1
    return age

# Helper function to determine the category based on age
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
        return "Opinn"  # Open category

CATEGORY_LABELS = {
    "U11": "U11",
    "U13": "U13",
    "U15": "U15",
    "U17": "U17",
    "U19": "U19",
    "U21": "U21",
    "Opinn": "Opinn flokkur"
}

GENDER_LABELS = {
    "KK": "KK",
    "KVK": "KVK"
}

# This function fetches results for a particular competition, ordered by rounds
def get_results_for_competition(competition):
    # Fetch rounds for the competition, ordered by round order
    rounds = Round.objects.filter(competition_category__competition=competition).order_by('-round_order')

    results = []
    
    # Iterate through the rounds and get round results
    for round in rounds:
        round_result = RoundResult.objects.filter(round=round).first()  # Get the first result for this round
        if round_result:
            rank = round_result.rank  # Get the rank for the current round
            
            results.append({
                "round_name": round.get_round_type_display(),  # Round name (e.g., Final, Semifinal)
                "rank": rank  # Just include the rank
            })
    
    return results

# API View to get details of an athlete
@api_view(["GET"])
@permission_classes([AllowAny])
def AthleteDetail(request, pk):
    athlete = get_object_or_404(UserAccount, pk=pk)

    # Calculate age and category logic
    age = calculate_age(athlete.date_of_birth)
    group_name = get_age_based_category(age)
    gender = athlete.gender
    category = f"{CATEGORY_LABELS[group_name]} {GENDER_LABELS.get(gender, gender)}"

    # Fetch competition registrations
    registrations = CompetitionRegistration.objects.filter(climber__user_account=athlete).select_related(
        "competition", "competition_category__category_group"
    )

    # Fetch the competition details, including results
    competitions = [
        {
            "id": reg.competition.id,
            "title": reg.competition.title,
            "category": f"{CATEGORY_LABELS.get(reg.competition_category.category_group.name)} {GENDER_LABELS.get(reg.competition_category.gender)}",
            "start_date": reg.competition.start_date,
            "results": get_results_for_competition(reg.competition)  # Fetch results for the competition
        }
        for reg in registrations
    ]

    # Count wins (where rank = 1)
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
