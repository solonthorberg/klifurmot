from datetime import date
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .models import Climber, CompetitionRegistration
from .serializers import ClimberSerializer, CompetitionRegistrationSerializer
from accounts.models import UserAccount
from scoring.models import RoundResult
from competitions.models import CompetitionRound
from .utils import calculate_age, get_age_based_category, CATEGORY_LABELS, GENDER_LABELS

class PublicClimbers(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        return Climber.objects.select_related(
            'user_account__nationality'  
        ).filter(
            deleted=False,
            is_simple_athlete=False,
            user_account__isnull=False,
            # Athletes who registered for competitions
            competitionregistration__isnull=False
        ).distinct()
    
    def list(self, request):
        queryset = self.get_queryset()
        data = []
    
        for climber in queryset:
            user_account = climber.user_account
            
            if not user_account:
                continue
                
            age = None
            category = None
            if user_account.date_of_birth:
                age = calculate_age(user_account.date_of_birth)
                if age is not None:
                    category = get_age_based_category(age)
            
            data.append({
                "id": climber.id,
                "user_account_id": user_account.id,
                "name": user_account.full_name or "Name not provided",
                "age": age,
                "height_cm": user_account.height_cm,
                "wingspan_cm": user_account.wingspan_cm,
                "profile_picture": user_account.profile_picture.url if user_account.profile_picture else None,
                "gender": user_account.gender,
                "nationality": user_account.nationality.country_code if user_account.nationality else None,
                "category": category,
            })
   
        
        return Response(data)
    
class GetClimberViewSet(viewsets.ModelViewSet):
    queryset = Climber.objects.all()
    serializer_class = ClimberSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def _add_age_data(self, climber_data):
        """Add age and age_category data to climber response"""
        if climber_data.get('is_simple_athlete', False):
            # Handle simple athletes
            if 'simple_age' in climber_data and climber_data['simple_age']:
                age = climber_data['simple_age']
                climber_data['age'] = age
                climber_data['age_category'] = get_age_based_category(age)
        else:
            # Handle regular athletes with user accounts
            if 'user_account' in climber_data and climber_data['user_account']:
                user_account = climber_data['user_account']
                if 'date_of_birth' in user_account and user_account['date_of_birth']:
                    birth_date_str = user_account['date_of_birth']
                    birth_date = date.fromisoformat(birth_date_str) if isinstance(birth_date_str, str) else birth_date_str
                    age = calculate_age(birth_date)
                    
                    user_account['age'] = age
                    if age is not None:
                        user_account['age_category'] = get_age_based_category(age)

    def _format_climber_data(self, climber_instance):
        """Format climber data to include both simple and regular athlete info"""
        if climber_instance.is_simple_athlete:
            return {
                'id': climber_instance.id,
                'is_simple_athlete': True,
                'simple_name': climber_instance.simple_name,
                'simple_age': climber_instance.simple_age,
                'simple_gender': climber_instance.simple_gender,
                'user_account': None,
                'created_at': climber_instance.created_at,
                'last_modified_at': climber_instance.last_modified_at
            }
        else:
            # Use the regular serializer for full user account athletes
            serializer = self.get_serializer(climber_instance)
            return serializer.data

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        
        if instance.is_simple_athlete:
            data = self._format_climber_data(instance)
        else:
            serializer = self.get_serializer(instance)
            data = serializer.data
            
        self._add_age_data(data)
        return Response(data)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            data = []
            for climber in page:
                climber_data = self._format_climber_data(climber)
                self._add_age_data(climber_data)
                data.append(climber_data)
            return self.get_paginated_response(data)

        data = []
        for climber in queryset:
            climber_data = self._format_climber_data(climber)
            self._add_age_data(climber_data)
            data.append(climber_data)
            
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


@api_view(['POST'])
@permission_classes([AllowAny])
def create_simple_athlete(request):
    """Allow admin to create simple athlete with just name, age, and gender"""
    #if not request.user.is_staff: 
    #    return Response({"detail": "Permission denied"}, status=status.HTTP_403_FORBIDDEN)
    
    data = request.data
    name = data.get('name', '').strip()
    age = data.get('age')
    gender = data.get('gender')
    
    if not all([name, age, gender]):
        return Response({"detail": "Name, age, and gender are required"}, status=status.HTTP_400_BAD_REQUEST)
    
    if gender not in ['KK', 'KVK']:
        return Response({"detail": "Gender must be 'KK' or 'KVK'"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        age = int(age)
        if age < 1 or age > 100:
            return Response({"detail": "Age must be between 1 and 100"}, status=status.HTTP_400_BAD_REQUEST)
    except ValueError:
        return Response({"detail": "Age must be a valid number"}, status=status.HTTP_400_BAD_REQUEST)
    
    climber = Climber.objects.create(
        simple_name=name,
        simple_age=age,
        simple_gender=gender,
        is_simple_athlete=True,
        created_by=request.user,
        last_modified_by=request.user
    )
    
    return Response({
        "detail": f"Athlete {name} created successfully",
        "climber_id": climber.id,
        "name": name,
        "age": age,
        "gender": gender
    }, status=status.HTTP_201_CREATED)