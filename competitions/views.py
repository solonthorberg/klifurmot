from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS
from django.shortcuts import get_object_or_404

from .models import (
    Competition, CategoryGroup, CompetitionCategory,
    Round, Boulder, JudgeBoulderAssignment
)
from .serializers import (
    CompetitionSerializer, CategoryGroupSerializer, CompetitionCategorySerializer,
    RoundSerializer, BoulderSerializer, JudgeBoulderAssignmentSerializer
)

from accounts.permissions import IsAdminForCompetition
from accounts.models import CompetitionRole, UserAccount



class ReadOnlyOrAdmin(IsAuthenticated):
    def has_permission(self, request, view):
        if request.user and request.user.is_staff:
            return True
        if request.method in SAFE_METHODS:
            return True
        return False

class CompetitionViewSet(viewsets.ModelViewSet):
    queryset = Competition.objects.all()
    serializer_class = CompetitionSerializer
    permission_classes = [ReadOnlyOrAdmin]

    def get_queryset(self):
        if not hasattr(self.request.user, 'profile'):
            return Competition.objects.none()
        user_roles = CompetitionRole.objects.filter(user=self.request.user.profile)
        competition_ids = user_roles.values_list('competition_id', flat=True)
        return Competition.objects.filter(id__in=competition_ids)

    def perform_create(self, serializer):
        competition = serializer.save(created_by=self.request.user, last_modified_by=self.request.user)
        if hasattr(self.request.user, 'profile'):
            CompetitionRole.objects.update_or_create(
                user=self.request.user.profile,
                competition=competition,
                defaults={"role": "admin", "created_by": self.request.user.profile}
            )


class CategoryGroupViewSet(viewsets.ModelViewSet):
    queryset = CategoryGroup.objects.all()
    serializer_class = CategoryGroupSerializer


class CompetitionCategoryViewSet(viewsets.ModelViewSet):
    queryset = CompetitionCategory.objects.all()
    serializer_class = CompetitionCategorySerializer
    permission_classes = [ReadOnlyOrAdmin]


class RoundViewSet(viewsets.ModelViewSet):
    serializer_class = RoundSerializer
    permission_classes = [IsAuthenticated, IsAdminForCompetition]

    def get_queryset(self):
        competition_id = self.request.query_params.get('competition_id')
        if competition_id:
            return Round.objects.filter(competition_category__competition_id=competition_id)
        return Round.objects.none()


class BoulderViewSet(viewsets.ModelViewSet):
    queryset = Boulder.objects.all()
    serializer_class = BoulderSerializer


class JudgeBoulderAssignmentViewSet(viewsets.ModelViewSet):
    queryset = JudgeBoulderAssignment.objects.all()
    serializer_class = JudgeBoulderAssignmentSerializer


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

