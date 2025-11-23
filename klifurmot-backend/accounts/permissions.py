from rest_framework.permissions import BasePermission, IsAuthenticated, SAFE_METHODS
from .models import CompetitionRole


class IsAuthenticatedOrReadOnly(BasePermission):
    """
    Allow full access to authenticated users and read-only access to unauthenticated users.
    """

    def has_permission(self, request, _view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated


class IsAdmin(IsAuthenticated):
    """
    Allow access only to users marked as admin in their profile.
    """

    def has_permission(self, request, _view):
        return getattr(request.user.profile, "is_admin", False)


class IsAdminOrReadOnly(IsAuthenticated):
    """
    Allow read-only access to any authenticated user,
    write access only to users marked as admin in their profile.
    """

    def has_permission(self, request, _view):
        if request.method in SAFE_METHODS:
            return True
        return getattr(request.user.profile, "is_admin", False)


class IsCompetitionAdmin(BasePermission):
    """
    Allow write access to global admins or competition-specific admins
    """

    def has_permission(self, request, _view):
        if request.method in SAFE_METHODS:
            return True

        if not request.user or not request.user.is_authenticated:
            return False

        if not hasattr(request.user, "profile"):
            return False

        if request.user.profile.is_admin:
            return True

        return True

    def has_object_permission(self, request, _view, obj):
        if request.method in SAFE_METHODS:
            return True

        user_profile = getattr(request.user, "profile", None)
        if not user_profile:
            return False

        if user_profile.is_admin:
            return True

        return CompetitionRole.objects.filter(
            user=user_profile, competition=obj, role="admin"
        ).exists()


class IsCompetitionAdminOrReadOnly(BasePermission):
    """
    Allow read-only access to authenticated users.
    Allow write access only to:
    1. Global admins (is_admin=True)
    2. Competition-specific admins (CompetitionRole with role='admin')
    """

    def has_permission(self, request, _view):
        if request.method in SAFE_METHODS:
            return True

        if not request.user or not request.user.is_authenticated:
            return False

        return True

    def has_object_permission(self, request, _view, obj):
        if request.method in SAFE_METHODS:
            return True

        if hasattr(request.user, "profile") and getattr(
            request.user.profile, "is_admin", False
        ):
            return True

        if hasattr(request.user, "profile"):
            return CompetitionRole.objects.filter(
                user=request.user.profile, competition=obj, role="admin"
            ).exists()

        return False


class IsDjangoAdminOrReadOnly(BasePermission):
    """
    Allow read-only access to anyone, write access only to Django admin users.
    """

    def has_permission(self, request, _view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


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
