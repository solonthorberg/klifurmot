from datetime import date
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from accounts.models import UserAccount
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from accounts.models import CompetitionRole
from athletes.models import CompetitionRegistration, Climber
from collections import defaultdict
from scoring.models import ClimberRoundScore, RoundResult, Climb
from django.db.models import Max
from django.db import transaction
from accounts.permissions import (
    IsAdminOrReadOnly,
    IsAuthenticatedOrReadOnly,
)

from athletes.utils import get_age_based_category, calculate_age, CATEGORY_LABELS, GENDER_LABELS

from .models import (
    Competition, CategoryGroup, CompetitionCategory,
    CompetitionRound, Boulder, JudgeBoulderAssignment, RoundGroup
)
from .serializers import (
    CompetitionSerializer, CategoryGroupSerializer, CompetitionCategorySerializer, RoundGroupSerializer,
    RoundSerializer, BoulderSerializer, JudgeBoulderAssignmentSerializer
)

class GetCompetitionViewSet(viewsets.ModelViewSet):
    queryset = Competition.objects.all()
    serializer_class = CompetitionSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Competition.objects.all()
        year = self.request.query_params.get("year")
        if year and year.isdigit():
            qs = qs.filter(start_date__year=int(year))
        return qs

    def perform_create(self, serializer):
        competition = serializer.save(
            created_by=self.request.user, 
            last_modified_by=self.request.user
        )
        if not hasattr(self.request.user, 'profile'):
            profile = UserAccount.objects.create(
                user=self.request.user,
                full_name=self.request.user.get_full_name() or self.request.user.username
            )
        else:
            profile = self.request.user.profile

        CompetitionRole.objects.update_or_create(
            user=profile,
            competition=competition,
            defaults={
                "role": "admin",
                "created_by": profile,
                "last_modified_by": profile
            }
        )

class CategoryGroupViewSet(viewsets.ModelViewSet):
    queryset = CategoryGroup.objects.all()
    serializer_class = CategoryGroupSerializer
    permission_classes = [AllowAny]

class RoundGroupViewSet(viewsets.ModelViewSet):
    queryset = RoundGroup.objects.all()
    serializer_class = RoundGroupSerializer
    permission_classes = [AllowAny]

class CompetitionCategoryViewSet(viewsets.ModelViewSet):
    queryset = CompetitionCategory.objects.all()
    serializer_class = CompetitionCategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        queryset = CompetitionCategory.objects.all()
        competition_id = self.request.query_params.get('competition_id')
        if competition_id is not None:
            queryset = queryset.filter(competition=competition_id)
        return queryset

class RoundViewSet(viewsets.ModelViewSet):
    serializer_class = RoundSerializer
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        competition_id = self.request.query_params.get('competition_id')
        if competition_id:
            return CompetitionRound.objects.filter(competition_category__competition_id=competition_id)
        return CompetitionRound.objects.none()

    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user,
            last_modified_by=self.request.user
        )

class BoulderViewSet(viewsets.ModelViewSet):
    queryset = Boulder.objects.all()
    serializer_class = BoulderSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

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
        serializer.save(
            created_by=self.request.user,
            last_modified_by=self.request.user
        )

class JudgeBoulderAssignmentViewSet(viewsets.ModelViewSet):
    queryset = JudgeBoulderAssignment.objects.all()
    serializer_class = JudgeBoulderAssignmentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

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
        .select_related("climber__user_account__nationality", "competition_category__category_group")
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

        grouped.setdefault(category_name, []).append(athlete_data)

    return Response(grouped)

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

    today = date.today()

    for rnd in rounds:
        category_obj = rnd.competition_category
        group_name = category_obj.category_group.name
        gender = category_obj.gender
        category_key = f"{group_name} {gender}"
        round_name = rnd.round_group.name

        results = rnd.roundresult_set.order_by("start_order")
        athletes = []

        for result in results:
            climber = result.climber
            ua = climber.user_account
            user = ua.user
            full_name = ua.full_name or user.username

            birth_date = ua.date_of_birth
            if birth_date:
                age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
                age_category = get_age_based_category(age)
            else:
                age_category = "–"

            athlete_data = {
                "climber_id": climber.id,
                "id": climber.id,
                "start_order": result.start_order,
                "full_name": full_name,
                "gender": ua.gender or "–",
                "category": group_name,
                "age_category": age_category
            }
            
            athletes.append(athlete_data)

        grouped_data[category_key][round_name].extend(athletes)

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
    except Competition.DoesNotExist:
        return Response({"detail": "Competition not found."}, status=404)

    grouped_data = defaultdict(lambda: defaultdict(list))

    rounds = CompetitionRound.objects.filter(
        competition_category__competition_id=pk
    ).select_related(
        "competition_category__category_group",
        "competition_category",
        "round_group"
    ).prefetch_related("climberroundscore_set__climber__user_account__user")

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

    result = [
        {
            "category": category_name,
            "rounds": [
                {
                    "round_name": round_name,
                    "results": athlete_list
                }
                for round_name, athlete_list in rounds_dict.items()
            ]
        }
        for category_name, rounds_dict in grouped_data.items()
    ]

    return Response(result)

class RegisterAthleteView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        competition_id = request.data.get('competition')
        category_name = request.data.get('category')
        round_name = request.data.get('round')
        climber_id = request.data.get('climber')
        
        if not all([competition_id, category_name, round_name, climber_id]):
            return Response(
                {"detail": "Missing required fields"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            parts = category_name.split()
            if len(parts) < 2:
                return Response(
                    {"detail": "Invalid category name format"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            gender = parts[-1]
            group_name = ' '.join(parts[:-1])
            
            category = CompetitionCategory.objects.get(
                competition_id=competition_id,
                category_group__name=group_name,
                gender=gender
            )
            
            round_obj = CompetitionRound.objects.get(
                competition_category=category,
                round_group__name=round_name
            )
            
            climber = Climber.objects.get(id=climber_id)
            
            existing_round_result = RoundResult.objects.filter(
                round=round_obj, 
                climber=climber
            ).first()
            
            if existing_round_result:
                return Response(
                    {"detail": f"{climber.user_account.full_name} er þegar skráð(ur) í {round_name}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            existing_registration = CompetitionRegistration.objects.filter(
                competition_id=competition_id,
                competition_category=category,
                climber=climber
            ).first()
            
            with transaction.atomic():
                if not existing_registration:
                    registration = CompetitionRegistration.objects.create(
                        competition_id=competition_id,
                        competition_category=category,
                        climber=climber,
                        created_by=request.user,
                        last_modified_by=request.user
                    )
                else:
                    registration = existing_registration
                
                max_order = RoundResult.objects.filter(
                    round=round_obj
                ).aggregate(Max('start_order'))['start_order__max'] or 0
                
                round_result = RoundResult.objects.create(
                    round=round_obj,
                    climber=climber,
                    start_order=max_order + 1,
                    created_by=request.user,
                    last_modified_by=request.user
                )
                
                return Response({
                    "detail": f"{climber.user_account.full_name} hefur verið skráð(ur) með númer {round_result.start_order}",
                    "registration_id": registration.id,
                    "round_result_id": round_result.id,
                    "start_order": round_result.start_order
                }, status=status.HTTP_201_CREATED)
                
        except CompetitionCategory.DoesNotExist:
            return Response(
                {"detail": f"Flokkur '{group_name} {gender}' fannst ekki"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except CompetitionRound.DoesNotExist:
            return Response(
                {"detail": f"Umferð '{round_name}' fannst ekki fyrir þennan flokk"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Climber.DoesNotExist:
            return Response(
                {"detail": "Keppandi fannst ekki"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {"detail": str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def RemoveAthleteView(request):
    data = request.data
    competition_id = data.get("competition")
    category_label = data.get("category")
    round_name = data.get("round")
    start_order = data.get("start_order")

    if not all([competition_id, category_label, round_name, start_order]):
        return Response({"detail": "Missing data"}, status=400)

    try:
        parts = category_label.strip().rsplit(" ", 1)
        if len(parts) != 2:
            return Response({"detail": "Invalid category format"}, status=400)

        group_name, gender = parts

        round_obj = CompetitionRound.objects.select_related(
            "competition_category__category_group"
        ).get(
            competition_category__competition_id=competition_id,
            competition_category__category_group__name=group_name,
            competition_category__gender=gender,
            round_group__name=round_name
        )

        result_to_remove = RoundResult.objects.get(round=round_obj, start_order=start_order)
        result_to_remove.delete()

        remaining = RoundResult.objects.filter(round=round_obj).order_by("start_order")
        for idx, r in enumerate(remaining, start=1):
            if r.start_order != idx:
                r.start_order = idx
                r.save()

        return Response({"detail": "Athlete removed and reordered."})

    except CompetitionRound.DoesNotExist:
        return Response({"detail": "Competition round not found."}, status=404)

    except RoundResult.DoesNotExist:
        return Response({"detail": "Athlete result not found."}, status=404)

    except Exception as e:
        return Response({"detail": "Unexpected error."}, status=500)

class UpdateStartOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            competition_id = request.data.get('competition')
            category_name = request.data.get('category')
            round_name = request.data.get('round')
            athletes_data = request.data.get('athletes', [])

            if not all([competition_id, category_name, round_name, athletes_data]):
                missing = []
                if not competition_id: missing.append('competition')
                if not category_name: missing.append('category')
                if not round_name: missing.append('round')
                if not athletes_data: missing.append('athletes')
                
                return Response(
                    {"detail": f"Missing required fields: {', '.join(missing)}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            parts = category_name.strip().split()
            if len(parts) < 2:
                return Response(
                    {"detail": f"Invalid category format. Expected: 'Group Name Gender', got: '{category_name}'"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            gender = parts[-1]
            group_name = " ".join(parts[:-1])

            try:
                competition_category = CompetitionCategory.objects.get(
                    competition_id=competition_id,
                    category_group__name=group_name,
                    gender=gender
                )
            except CompetitionCategory.DoesNotExist:
                available_categories = CompetitionCategory.objects.filter(
                    competition_id=competition_id
                ).select_related('category_group')
                
                available_list = [f"{cat.category_group.name} {cat.gender}" for cat in available_categories]
                
                return Response(
                    {"detail": f"Category not found: {category_name}. Available: {available_list}"}, 
                    status=status.HTTP_404_NOT_FOUND
                )

            try:
                round_obj = CompetitionRound.objects.get(
                    competition_category=competition_category,
                    round_group__name=round_name
                )
            except CompetitionRound.DoesNotExist:
                available_rounds = CompetitionRound.objects.filter(
                    competition_category=competition_category
                ).select_related('round_group')
                
                available_list = [r.round_group.name for r in available_rounds]
                
                return Response(
                    {"detail": f"Round not found: {round_name}. Available: {available_list}"}, 
                    status=status.HTTP_404_NOT_FOUND
                )

            updated_count = 0
            errors = []

            for i, athlete_data in enumerate(athletes_data):
                climber_id = athlete_data.get('climber_id')
                start_order = athlete_data.get('start_order')

                if not climber_id or start_order is None:
                    error_msg = f"Missing climber_id or start_order in athlete {i+1}: {athlete_data}"
                    errors.append(error_msg)
                    continue

                try:
                    round_result = RoundResult.objects.get(
                        round=round_obj,
                        climber_id=climber_id
                    )
                    
                    round_result.start_order = start_order
                    round_result.last_modified_by = request.user
                    round_result.save()
                    
                    updated_count += 1

                except RoundResult.DoesNotExist:
                    error_msg = f"Round result not found for climber {climber_id} in round {round_name}"
                    errors.append(error_msg)
                except Exception as e:
                    error_msg = f"Error updating climber {climber_id}: {str(e)}"
                    errors.append(error_msg)

            response_data = {
                "status": "success" if updated_count > 0 else "error",
                "updated_count": updated_count,
                "total_athletes": len(athletes_data)
            }

            if errors:
                response_data["errors"] = errors
                if updated_count > 0:
                    response_data["status"] = "partial_success"

            status_code = status.HTTP_200_OK if updated_count > 0 else status.HTTP_400_BAD_REQUEST
            return Response(response_data, status=status_code)

        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {"detail": f"Unexpected error: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )