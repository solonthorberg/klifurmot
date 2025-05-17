from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS
from .models import Climber, CompetitionRegistration
from .serializers import ClimberSerializer, CompetitionRegistrationSerializer

class ReadOnlyOrIsAuthenticated(IsAuthenticated):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return super().has_permission(request, view)

class ClimberViewSet(viewsets.ModelViewSet):
    queryset = Climber.objects.all()
    serializer_class = ClimberSerializer
    permission_classes = [ReadOnlyOrIsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Climber.objects.all()
        elif hasattr(self.request.user, 'profile'):
            return Climber.objects.filter(user=self.request.user.profile)
        return Climber.objects.all()

class CompetitionRegistrationViewSet(viewsets.ModelViewSet):
    queryset = CompetitionRegistration.objects.all()
    serializer_class = CompetitionRegistrationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = CompetitionRegistration.objects.all()
        competition = self.request.query_params.get("competition")
        climber = self.request.query_params.get("climber")
        if competition:
            qs = qs.filter(competition_id=competition)
        if climber:
            qs = qs.filter(climber_id=climber)
        return qs
