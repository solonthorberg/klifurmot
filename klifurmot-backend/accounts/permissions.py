from rest_framework.permissions import BasePermission, IsAuthenticated, SAFE_METHODS

class IsAuthenticatedOrReadOnly(BasePermission):
    """
    Allow full access to authenticated users and read-only access to unauthenticated users.
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return request.user and request.user.is_authenticated


class IsAdminOrReadOnly(IsAuthenticated):
    """
    Allow read-only access to any authenticated user,
    write access only to users marked as admin in their profile.
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return getattr(request.user.profile, "is_admin", False)
