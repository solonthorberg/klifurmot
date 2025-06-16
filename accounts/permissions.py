from rest_framework.permissions import BasePermission, IsAuthenticated, SAFE_METHODS
from accounts.models import CompetitionRole


class IsAdminForCompetition(BasePermission):
    """Permission class that allows access only to users marked as 'admin' for a specific competition."""

    def has_permission(self, request, view):
        competition_id = view.kwargs.get('competition_id') or request.query_params.get('competition_id')
        if not request.user.is_authenticated or not competition_id:
            return False

        if not hasattr(request.user, 'profile'):
            return False

        return CompetitionRole.objects.filter(
            user=request.user.profile,
            competition_id=competition_id,
            role='admin'
        ).exists()


class IsJudgeForCompetition(BasePermission):
    """Permission class that allows access only to users marked as 'judge' for a specific competition."""

    def has_permission(self, request, view):
        competition_id = view.kwargs.get('competition_id') or request.query_params.get('competition_id')
        if not request.user.is_authenticated or not competition_id:
            return False

        if not hasattr(request.user, 'profile'):
            return False

        return CompetitionRole.objects.filter(
            user=request.user.profile,
            competition_id=competition_id,
            role='judge'
        ).exists()


class CompetitionAdminOrReadOnly(IsAuthenticated):
    """Custom permission: allow read-only access to any user, write access only to competition admins."""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        try:
            return request.user.profile.is_admin
        except AttributeError:
            return False


class IsAuthenticatedOrReadOnly(IsAuthenticated):
    """Allow full access to authenticated users and read-only access to unauthenticated users."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return super().has_permission(request, view)
