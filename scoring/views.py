from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import RoundResult, Climb, ClimberRoundScore
from .serializers import RoundResultSerializer, ClimbSerializer, ClimberRoundScoreSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny, SAFE_METHODS

# Create your views here.
class ReadOnlyOrIsAuthenticated(IsAuthenticated):
    def has_permission(self, request, view):
        if request.user and request.user.is_staff:
            return True
        if request.method in SAFE_METHODS:
            return True
        return super().has_permission(request, view)

class RoundResultViewSet(viewsets.ModelViewSet):
    queryset = RoundResult.objects.all()
    serializer_class = RoundResultSerializer
    permission_classes = [ReadOnlyOrIsAuthenticated]

    def get_queryset(self):
        qs = RoundResult.objects.all()
        user = self.request.user
        if user.is_authenticated and not user.is_staff and hasattr(user, 'profile'):
            qs = qs.filter(climber__user=user.profile)
        climber_id = self.request.query_params.get("climber_id")
        if climber_id:
            qs = qs.filter(climber_id=climber_id)
        round_id = self.request.query_params.get("round_id")
        if round_id:
            qs = qs.filter(round_id=round_id)
        return qs

class ClimbViewSet(viewsets.ModelViewSet):
    queryset = Climb.objects.all()
    serializer_class = ClimbSerializer
    permission_classes = [ReadOnlyOrIsAuthenticated]

    def get_queryset(self):
        qs = Climb.objects.all()
        round_id = self.request.query_params.get('round_id')
        boulder_id = self.request.query_params.get('boulder_id')
        if round_id:
            qs = qs.filter(boulder__round_id=round_id)
        if boulder_id:
            qs = qs.filter(boulder_id=boulder_id)

        if self.request.user.is_staff:
            return qs
        elif hasattr(self.request.user, 'profile'):
            return qs.filter(judge=self.request.user.profile)
        return qs.none()

class ClimberRoundScoreViewSet(viewsets.ModelViewSet):
    queryset = ClimberRoundScore.objects.all()
    serializer_class = ClimberRoundScoreSerializer
    permission_classes = [ReadOnlyOrIsAuthenticated]

    def get_queryset(self):
        round_id = self.request.query_params.get('round_id')
        if round_id:
            return ClimberRoundScore.objects.filter(round_id=round_id)
        return ClimberRoundScore.objects.all()


class StartListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        round_id = request.query_params.get("round_id")
        if not round_id:
            return Response({"detail": "round_id is required."}, status=400)

        start_list = RoundResult.objects.filter(round_id=round_id, deleted=False).order_by("start_order")
        data = [
            {
                "climber": result.climber.full_name,
                "start_order": result.start_order
            }
            for result in start_list
        ]
        return Response(data)
    
class ResultsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        round_id = request.query_params.get("round_id")
        if not round_id:
            return Response({"detail": "round_id is required."}, status=400)

        results = ClimberRoundScore.objects.filter(round_id=round_id).order_by("-total_score")
        data = [
            {
                "climber": result.climber.full_name,
                "rank": idx + 1,
                "total_score": float(result.total_score)
            }
            for idx, result in enumerate(results)
        ]
        return Response(data)