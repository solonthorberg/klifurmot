from rest_framework.permissions import BasePermission, IsAuthenticated, SAFE_METHODS
from .models import CompetitionRole

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

class IsCompetitionAdminOrReadOnly(BasePermission):
    """
    Allow read-only access to authenticated users.
    Allow write access only to:
    1. Global admins (is_admin=True)
    2. Competition-specific admins (CompetitionRole with role='admin')
    """
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
            
        if not request.user or not request.user.is_authenticated:
            return False

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
            
        if hasattr(request.user, 'profile') and getattr(request.user.profile, "is_admin", False):
            return True
            
        if hasattr(request.user, 'profile'):
            return CompetitionRole.objects.filter(
                user=request.user.profile,
                competition=obj,
                role='admin'
            ).exists()
            
        return False