from rest_framework.routers import DefaultRouter
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from .views import RoundResultViewSet, ClimbViewSet, ClimberRoundScoreViewSet, StartListView, ResultsView

router = DefaultRouter()
router.register(r'round-results', RoundResultViewSet)
router.register(r'climbs', ClimbViewSet)
router.register(r'scores', ClimberRoundScoreViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('startlist/', StartListView.as_view(), name='startlist'),
    path('results/', ResultsView.as_view(), name='results'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)