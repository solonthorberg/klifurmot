from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS
from .models import Climber, CompetitionRegistration
from .serializers import ClimberSerializer, CompetitionRegistrationSerializer
from rest_framework.permissions import IsAuthenticatedOrReadOnly


class ClimberViewSet(viewsets.ModelViewSet):
    queryset = Climber.objects.all()
    serializer_class = ClimberSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
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
