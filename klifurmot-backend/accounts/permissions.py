from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Allow access only to platform-wide admins."""

    def has_permission(self, request, _view):
        if not request.user or not request.user.is_authenticated:
            return False
        profile = getattr(request.user, "profile", None)
        if not profile:
            return False
        return profile.is_admin
