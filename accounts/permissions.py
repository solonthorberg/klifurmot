from rest_framework.permissions import BasePermission
from accounts.models import CompetitionRole

class IsAdminForCompetition(BasePermission):
    """Allow access only to users marked as 'admin' for the competition."""
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
    """Allow access only to users marked as 'judge' for the competition."""
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
