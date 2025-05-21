from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework import status

from competitions.models import CompetitionRound
from .models import RoundResult, Climb, ClimberRoundScore
from .serializers import RoundResultSerializer, ClimbSerializer, ClimberRoundScoreSerializer
from rest_framework.permissions import IsAuthenticated, SAFE_METHODS

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

        print(f"CLIMB GET: round_id={round_id}, boulder_id={boulder_id}, user={self.request.user}")

        if round_id:
            qs = qs.filter(boulder__round_id=round_id)
        if boulder_id:
            qs = qs.filter(boulder_id=boulder_id)

        if self.request.method in SAFE_METHODS:
            # No judge restriction for safe methods
            return qs
        if self.request.user.is_staff:
            return qs
        return qs.filter(judge=self.request.user)


    @action(detail=False, methods=["post"], url_path="record_attempt", permission_classes=[IsAuthenticated])
    def record_attempt(self, request):
        data = request.data

        print("RECEIVED POST DATA:", data)

        try:
            climber_id = int(data["climber"])
            boulder_id = int(data["boulder"])
        except (KeyError, ValueError):
            return Response({"detail": "climber and boulder must be valid integers"}, status=400)

        try:
            judge_user = request.user
        except AttributeError:
            return Response({"detail": "User is not authenticated properly"}, status=400)

        try:
            climb, _ = Climb.objects.update_or_create(
                climber_id=climber_id,
                boulder_id=boulder_id,
                judge=judge_user,
                defaults={
                    "attempts_top": int(data.get("attempts_top", 0)),
                    "attempts_zone": int(data.get("attempts_zone", 0)),
                    "top_reached": data.get("top_reached", False),
                    "zone_reached": data.get("zone_reached", False),
                }
            )
            return Response({"detail": "Climb recorded"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

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
        competition_id = request.query_params.get("competition_id")
        category_id = request.query_params.get("category_id")
        round_group_id = request.query_params.get("round_group_id")

        if round_id:
            start_list = RoundResult.objects.filter(round_id=round_id, deleted=False).order_by("start_order")
        elif all([competition_id, category_id, round_group_id]):
            try:
                competition_round = CompetitionRound.objects.get(
                    competition_category__competition_id=competition_id,
                    competition_category_id=category_id,
                    round_group_id=round_group_id
                )
            except CompetitionRound.DoesNotExist:
                return Response({"detail": "No round found for those filters"}, status=404)

            start_list = RoundResult.objects.filter(round=competition_round, deleted=False).order_by("start_order")
        else:
            return Response({"detail": "Missing round_id or (competition_id, category_id, round_group_id)."}, status=400)

        data = [
            {
                "climber": result.climber.user_account.full_name,
                "climber_id": result.climber.id,
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
                "climber": result.climber.user_account.full_name,
                "rank": idx + 1,
                "total_score": float(result.total_score)
            }
            for idx, result in enumerate(results)
        ]
        return Response(data)
