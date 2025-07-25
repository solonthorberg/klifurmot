from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, SAFE_METHODS
from rest_framework.decorators import action
from .utils import FormatCompetitionResults, AutoAdvanceClimbers, UpdateRoundScoreForBoulder
from competitions.models import Boulder, CompetitionRound
from .models import RoundResult, Climb, ClimberRoundScore
from .serializers import RoundResultSerializer, ClimbSerializer, ClimberRoundScoreSerializer
from accounts.models import CompetitionRole
from django.utils import timezone
from .utils import BroadcastScoreUpdate

from accounts.permissions import (
    IsAuthenticatedOrReadOnly,
)


class RoundResultViewSet(viewsets.ModelViewSet):
    queryset = RoundResult.objects.all()
    serializer_class = RoundResultSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

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
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Climb.objects.all()
        round_order = self.request.query_params.get('round_order')
        boulder_number = self.request.query_params.get('boulder_number')
        competition_id = self.request.query_params.get('competition_id')
        climber_id = self.request.query_params.get('climber_id')
        category_id = self.request.query_params.get('category_id')

        try:
            if round_order and boulder_number and competition_id:
                qs = qs.filter(
                    boulder__boulder_number=int(boulder_number),
                    boulder__round__round_order=int(round_order),
                    boulder__round__competition_category__competition_id=int(competition_id)
                )
            if climber_id:
                qs = qs.filter(climber_id=int(climber_id))
            if category_id:
                qs = qs.filter(boulder__round__competition_category_id=int(category_id))
        except ValueError:
            return Climb.objects.none()

        if self.request.method in SAFE_METHODS:
            return qs

        if self.request.user.is_staff:
            return qs
        elif hasattr(self.request.user, 'profile'):
            return qs.filter(judge=self.request.user)

        return Climb.objects.none()

    @action(detail=False, methods=["post"], url_path="record_attempt", permission_classes=[IsAuthenticatedOrReadOnly])
    def record_attempt(self, request):
        data = request.data
        try:
            climber_id = int(data["climber"])
            boulder_id = int(data["boulder"])
            competition_id = int(data["competition"])
        except (KeyError, ValueError):
            return Response({"detail": "climber, boulder, and competition must be valid integers"}, status=400)

        user = request.user

        if not CompetitionRole.objects.filter(
            user__user=user,
            competition_id=competition_id,
            role__in=["judge", "admin"]
        ).exists():
            return Response({"detail": "You are not authorized to judge in this competition."}, status=403)

        try:
            boulder = Boulder.objects.select_related("round__competition_category__competition").get(id=boulder_id)
            if boulder.round.competition_category.competition_id != competition_id:
                return Response({"detail": "Boulder does not belong to specified competition"}, status=400)
        except Boulder.DoesNotExist:
            return Response({"detail": "Boulder not found"}, status=404)

        try:
            boulder_climb = Climb.objects.filter(climber_id=climber_id, boulder=boulder).first()
            if boulder_climb:
                boulder_climb.judge = user
                boulder_climb.attempts_top = int(data.get("attempts_top", 0))
                boulder_climb.attempts_zone = int(data.get("attempts_zone", 0))
                boulder_climb.top_reached = data.get("top_reached", False)
                boulder_climb.zone_reached = data.get("zone_reached", False)
                boulder_climb.save()
            else:
                boulder_climb = Climb.objects.create(
                    climber_id=climber_id,
                    boulder=boulder,
                    judge=user,
                    attempts_top=int(data.get("attempts_top", 0)),
                    attempts_zone=int(data.get("attempts_zone", 0)),
                    top_reached=data.get("top_reached", False),
                    zone_reached=data.get("zone_reached", False),
                )
            UpdateRoundScoreForBoulder(boulder_climb)
            UpdateRoundResults(boulder_climb.boulder.round)
            return Response({"status": "success", "climb_id": boulder_climb.id}, status=200)
        except Exception as e:
            return Response({"detail": str(e)}, status=400)

    @action(detail=False, methods=["get"], url_path="bulk-scores", permission_classes=[IsAuthenticatedOrReadOnly])
    def bulk_scores(self, request):
        round_order = request.query_params.get("round_order")
        boulder_number = request.query_params.get("boulder_number")
        competition_id = request.query_params.get("competition_id")
        category_id = request.query_params.get("category_id")

        if not (round_order and boulder_number and competition_id and category_id):
            return Response({"detail": "Missing required filters."}, status=400)

        climbs = Climb.objects.filter(
            boulder__boulder_number=boulder_number,
            boulder__round__round_order=round_order,
            boulder__round__competition_category__competition_id=competition_id,
            boulder__round__competition_category_id=category_id
        )

        serializer = ClimbSerializer(climbs, many=True)
        return Response(serializer.data)

class ClimberRoundScoreViewSet(viewsets.ModelViewSet):
    queryset = ClimberRoundScore.objects.all()
    serializer_class = ClimberRoundScoreSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

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


class FullCompetitionResultsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, competition_id):
        data = FormatCompetitionResults(competition_id)
        return Response(data)
    
class AdvanceClimbersView(APIView):
    permission_classes = [IsAuthenticatedOrReadOnly]

    def post(self, request, round_id):
        try:
            current_round = CompetitionRound.objects.get(id=round_id)
        except CompetitionRound.DoesNotExist:
            return Response({"detail": "Invalid round ID."}, status=404)

        result = AutoAdvanceClimbers(current_round)
        return Response(result)
    
def UpdateRoundResults(round_obj):
    """
    Recalculates and updates ranks in RoundResult based on ClimberRoundScores
    for the given round.
    """
    scores = list(
        ClimberRoundScore.objects
        .filter(round=round_obj)
        .select_related('climber')
    )

    all_rounds = list(
        CompetitionRound.objects
        .filter(competition_category=round_obj.competition_category)
        .order_by('round_order')
    )
    try:
        current_index = all_rounds.index(round_obj)
        previous_round = all_rounds[current_index - 1] if current_index > 0 else None
    except ValueError:
        previous_round = None

    prev_rank_map = {}
    if previous_round:
        prev_results = RoundResult.objects.filter(round=previous_round).select_related('climber')
        prev_rank_map = {res.climber.id: res.rank for res in prev_results}

    scores.sort(key=lambda s: (-s.total_score, prev_rank_map.get(s.climber.id, 9999)))

    actual_rank = 1
    tie_count = 0
    previous_score = None
    previous_rank = None

    for i, score in enumerate(scores):
        if previous_score is not None and score.total_score == previous_score:
            assigned_rank = previous_rank
            tie_count += 1
        else:
            if previous_score is not None:
                actual_rank += tie_count
            assigned_rank = actual_rank
            previous_rank = assigned_rank
            tie_count = 1

        RoundResult.objects.update_or_create(
            round=round_obj,
            climber=score.climber,
            defaults={
                'rank': assigned_rank,
                'last_modified_at': timezone.now(),
            }
        )

        previous_score = score.total_score


    BroadcastScoreUpdate(round_obj.competition_category.competition_id)
