from rest_framework.routers import DefaultRouter
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from .views import RoundResultViewSet, ClimbViewSet, ClimberRoundScoreViewSet, StartListView, ResultsView, FullCompetitionResultsView, AdvanceClimbersView

router = DefaultRouter()
router.register(r'round-results', RoundResultViewSet)
router.register(r'climbs', ClimbViewSet)
router.register(r'scores', ClimberRoundScoreViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('startlist/', StartListView.as_view(), name='startlist'),
    path('results/', ResultsView.as_view(), name='results'),
    path('results/full/<int:competition_id>/', FullCompetitionResultsView.as_view(), name='full_results'),
    path("advance/<int:round_id>/", AdvanceClimbersView.as_view(), name="advance_climbers"),
]