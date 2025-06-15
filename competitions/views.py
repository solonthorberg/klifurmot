# competitions/views.py - Updated permission classes

from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from accounts.models import UserAccount
from rest_framework.permissions import AllowAny
from rest_framework.decorators import api_view, permission_classes
from accounts.models import CompetitionRole
from athletes.models import CompetitionRegistration
from collections import defaultdict
from scoring.models import ClimberRoundScore, RoundResult

from .models import (
    Competition, CategoryGroup, CompetitionCategory,
    CompetitionRound, Boulder, JudgeBoulderAssignment, RoundGroup
)
from .serializers import (
    CompetitionSerializer, CategoryGroupSerializer, CompetitionCategorySerializer, RoundGroupSerializer,
    RoundSerializer, BoulderSerializer, JudgeBoulderAssignmentSerializer
)

from accounts.permissions import IsAdminForCompetition
from accounts.models import CompetitionRole, UserAccount
from scoring.models import Climb

# ✅ Updated permission class - more permissive for authenticated users
class IsAuthenticatedOrReadOnly(IsAuthenticated):
    """
    Allow authenticated users to create/edit, anonymous users to read
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return super().has_permission(request, view)

class GetCompetitionViewSet(viewsets.ModelViewSet):
    queryset = Competition.objects.all()
    serializer_class = CompetitionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]  # ✅ More permissive

    def get_queryset(self):
        qs = Competition.objects.all()
        print("Initial queryset:", qs)

        year = self.request.query_params.get("year")
        if year and year.isdigit():
            qs = qs.filter(start_date__year=int(year))
            print("Filtered by year:", qs)

        return qs

    def perform_create(self, serializer):
        try:
            print("📝 Creating competition with data:", self.request.data)
            
            competition = serializer.save(
                created_by=self.request.user, 
                last_modified_by=self.request.user
            )
            
            print("✅ Competition created successfully:", competition.id)
            
            # Create admin role for the creator
            if hasattr(self.request.user, 'profile'):
                CompetitionRole.objects.update_or_create(
                    user=self.request.user.profile,
                    competition=competition,
                    defaults={
                        "role": "admin", 
                        "created_by": self.request.user.profile
                    }
                )
                print("✅ Admin role created for user")
            
        except Exception as e:
            print("❌ Error creating competition:", str(e))
            raise

class CategoryGroupViewSet(viewsets.ModelViewSet):
    queryset = CategoryGroup.objects.all()
    serializer_class = CategoryGroupSerializer
    permission_classes = [AllowAny]  # ✅ Allow anyone to read category groups

class RoundGroupViewSet(viewsets.ModelViewSet):
    queryset = RoundGroup.objects.all()
    serializer_class = RoundGroupSerializer
    permission_classes = [AllowAny]  # ✅ Allow anyone to read round groups

# ✅ Updated to be more permissive for competition creation
class CompetitionCategoryViewSet(viewsets.ModelViewSet):
    queryset = CompetitionCategory.objects.all()
    serializer_class = CompetitionCategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]  # ✅ Allow authenticated users to create

    def perform_create(self, serializer):
        """Override to set created_by and last_modified_by"""
        serializer.save(
            created_by=self.request.user,
            last_modified_by=self.request.user
        )
        print("✅ Competition category created successfully")

class RoundViewSet(viewsets.ModelViewSet):
    serializer_class = RoundSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]  # ✅ Allow authenticated users to create

    def get_queryset(self):
        competition_id = self.request.query_params.get('competition_id')
        if competition_id:
            return CompetitionRound.objects.filter(competition_category__competition_id=competition_id)
        return CompetitionRound.objects.none()

    def perform_create(self, serializer):
        """Override to set created_by and last_modified_by"""
        serializer.save(
            created_by=self.request.user,
            last_modified_by=self.request.user
        )
        print("✅ Competition round created successfully")

class BoulderViewSet(viewsets.ModelViewSet):
    queryset = Boulder.objects.all()
    serializer_class = BoulderSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]  # ✅ Allow authenticated users to create

    def get_queryset(self):
        queryset = Boulder.objects.all()
        competition_id = self.request.query_params.get("competition_id")
        category_id = self.request.query_params.get("category_id")
        round_group_id = self.request.query_params.get("round_group_id")
        round_id = self.request.query_params.get("round_id")

        if round_id:
            return queryset.filter(round_id=round_id)
        elif competition_id and category_id and round_group_id:
            return queryset.filter(
                round__competition_category__competition_id=competition_id,
                round__competition_category_id=category_id,
                round__round_group_id=round_group_id
            )
        return queryset.none()

    def perform_create(self, serializer):
        """Override to set created_by and last_modified_by"""
        serializer.save(
            created_by=self.request.user,
            last_modified_by=self.request.user
        )
        print("✅ Boulder created successfully")

class JudgeBoulderAssignmentViewSet(viewsets.ModelViewSet):
    queryset = JudgeBoulderAssignment.objects.all()
    serializer_class = JudgeBoulderAssignmentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

# Rest of your existing views remain the same...
class AssignRoleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, competition_id):
        if not hasattr(request.user, 'profile') or not CompetitionRole.objects.filter(
            user=request.user.profile,
            competition_id=competition_id,
            role='admin'
        ).exists():
            return Response({"detail": "Only competition admins can assign roles."}, status=403)

        target_user_id = request.data.get("user_id")
        role = request.data.get("role")

        if role not in ['admin', 'judge']:
            return Response({"detail": "Invalid role."}, status=400)

        try:
            competition = Competition.objects.get(id=competition_id)
            target_user = UserAccount.objects.get(id=target_user_id)
        except (Competition.DoesNotExist, UserAccount.DoesNotExist):
            return Response({"detail": "Invalid competition or user."}, status=404)

        CompetitionRole.objects.update_or_create(
            user=target_user,
            competition=competition,
            defaults={"role": role, "created_by": request.user.profile}
        )

        return Response({"detail": f"Assigned role '{role}' to user {target_user_id}."}, status=200)

# Your existing API view functions remain the same...
@api_view(["GET"])
@permission_classes([AllowAny])
def GetCompetitionAthletes(request, pk):
    try:
        competition = Competition.objects.get(pk=pk)
    except Competition.DoesNotExist:
        return Response({"detail": "Competition not found."}, status=404)

    registrations = (
        CompetitionRegistration.objects
        .filter(competition=competition, deleted=False)
        .select_related(
            "climber__user_account__nationality",
            "competition_category__category_group"
        )
    )

    grouped = {}
    for reg in registrations:
        climber = reg.climber
        user = getattr(climber, "user_account", None)
        if not user:
            continue

        category_name = str(reg.competition_category)

        athlete_data = {
            "id": climber.id,
            "full_name": user.full_name,
            "gender": user.gender or "–",
            "nationality": user.nationality.name_local if user.nationality else "–",
        }

        if category_name not in grouped:
            grouped[category_name] = []

        grouped[category_name].append(athlete_data)

    return Response(grouped)

# ... (rest of your existing view functions remain unchanged)



@api_view(["GET"])
@permission_classes([AllowAny])
def GetCompetitionBoulders(request, pk):
    try:
        competition = Competition.objects.get(pk=pk)
    except Competition.DoesNotExist:
        return Response({"detail": "Competition not found."}, status=404)

    categories = CompetitionCategory.objects.filter(competition_id=pk)\
        .select_related("category_group")\
        .prefetch_related("competitionround_set__boulder_set")

    response_data = []

    for cat in categories:
        category_label = f"{cat.category_group.name} {cat.gender}"

        rounds_data = []

        for rnd in cat.competitionround_set.all():
            boulders_data = []
            for boulder in rnd.boulder_set.all():
                climbs = Climb.objects.filter(boulder=boulder)
                tops = climbs.filter(top_reached=True).count()
                zones = climbs.filter(zone_reached=True).count()

                boulders_data.append({
                    "number": boulder.boulder_number,
                    "tops": tops,
                    "zones": zones
                })

            rounds_data.append({
                "round_name": rnd.round_group.name,
                "boulders": boulders_data
            })

        response_data.append({
            "category": category_label,
            "rounds": rounds_data
        })

    return Response(response_data)

from collections import defaultdict

@api_view(["GET"])
@permission_classes([AllowAny])
def GetCompetitionStartlist(request, pk):
    try:
        competition = Competition.objects.get(pk=pk)
    except Competition.DoesNotExist:
        return Response({"detail": "Competition not found."}, status=404)

    grouped_data = defaultdict(lambda: defaultdict(list))

    rounds = CompetitionRound.objects.filter(
        competition_category__competition_id=pk
    ).select_related(
        "competition_category__category_group",
        "competition_category",
        "round_group"
    ).prefetch_related("roundresult_set__climber__user_account__user")

    for rnd in rounds:
        category_obj = rnd.competition_category
        group_name = category_obj.category_group.name
        gender = category_obj.gender
        category_key = f"{group_name} {gender}"

        round_name = rnd.round_group.name  # ✅ Use string, not model

        results = rnd.roundresult_set.order_by("start_order")
        athletes = []
        for result in results:
            climber = result.climber
            ua = climber.user_account
            user = ua.user
            full_name = ua.full_name or user.username

            athletes.append({
                "start_order": result.start_order,
                "full_name": full_name,
                "gender": ua.gender or "–",
                "category": group_name
            })

        grouped_data[category_key][round_name].extend(athletes)  # ✅ Use string key

    response = []
    for category_name, rounds_dict in grouped_data.items():
        response.append({
            "category": category_name,
            "rounds": [
                {
                    "round_name": round_name,
                    "athletes": athlete_list
                }
                for round_name, athlete_list in rounds_dict.items()
            ]
        })

    return Response(response)

@api_view(["GET"])
@permission_classes([AllowAny])
def GetCompetitionResults(request, pk):
    try:
        competition = Competition.objects.get(pk=pk)
        print(f"Competition found: {competition.title}")
    except Competition.DoesNotExist:
        return Response({"detail": "Competition not found."}, status=404)

    grouped_data = defaultdict(lambda: defaultdict(list))

    rounds = CompetitionRound.objects.filter(
        competition_category__competition_id=pk
    ).select_related(
        "competition_category__category_group",
        "competition_category",
        "round_group"
    ).prefetch_related(
        "climberroundscore_set__climber__user_account__user"
    )

    for rnd in rounds:
        category = rnd.competition_category
        group_name = category.category_group.name
        gender = category.gender
        category_label = f"{group_name} {gender}"

        round_label = rnd.round_group.name

        scores = ClimberRoundScore.objects.filter(round=rnd)\
            .select_related("climber__user_account__user")\
            .order_by("-total_score")

        for rank, score in enumerate(scores, start=1):
            climber = score.climber
            user = climber.user_account.user
            full_name = user.get_full_name() or user.username

            climbs = Climb.objects.filter(climber=climber, boulder__round=rnd)
            total_top_attempts = sum(c.attempts_top for c in climbs if c.top_reached)
            total_zone_attempts = sum(c.attempts_zone for c in climbs if c.zone_reached)

            grouped_data[category_label][round_label].append({
                "rank": rank,
                "full_name": full_name,
                "tops": score.tops,
                "zones": score.zones,
                "attempts_top": total_top_attempts,
                "attempts_zone": total_zone_attempts
            })

    result = []
    for category_name, rounds_dict in grouped_data.items():
        result.append({
            "category": category_name,
            "rounds": [
                {
                    "round_name": round_name,
                    "results": athlete_list
                }
                for round_name, athlete_list in rounds_dict.items()
            ]
        })

    return Response(result)

