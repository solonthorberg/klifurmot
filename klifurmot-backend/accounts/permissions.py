from rest_framework.permissions import BasePermission, IsAuthenticated, SAFE_METHODS
from .models import CompetitionRole


class IsAdmin(IsAuthenticated):
    """
    Allow access only to users marked as admin in their profile.
    """

    def has_permission(self, request, _view):
        return getattr(request.user.profile, "is_admin", False)


class IsCompetitionAdmin(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True

        if not request.user or not request.user.is_authenticated:
            return False

        if not hasattr(request.user, "profile"):
            return False

        if request.user.profile.is_admin:
            return True

        competition_id = (
            request.data.get("competition")
            or request.data.get("competition_id")
            or request.query_params.get("competition_id")
            or (view.kwargs.get("competition_id") if view else None)
        )

        if not competition_id:
            return False

        return CompetitionRole.objects.filter(
            user=request.user.profile,
            competition_id=competition_id,
            role="admin",
        ).exists()


class IsActiveAccount(BasePermission):
    """
    Permission class to check if user account is not deleted
    """

    def has_permission(self, request, _view):
        if not request.user.is_authenticated:
            return False

        user_account = getattr(request.user, "profile", None)
        if not user_account:
            return False

        if user_account.deleted:
            return False

        return True


class IsCompetitionJudge(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not hasattr(request.user, "profile"):
            return False

        if request.user.profile.is_admin:
            return True

        competition_id = (
            request.data.get("competition")
            or request.data.get("competition_id")
            or request.query_params.get("competition_id")
            or (view.kwargs.get("competition_id") if view else None)
        )

        if not competition_id:
            return False

        return CompetitionRole.objects.filter(
            user=request.user.profile,
            competition_id=competition_id,
            role__in=["judge", "admin"],
        ).exists()
