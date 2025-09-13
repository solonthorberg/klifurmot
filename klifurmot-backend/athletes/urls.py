from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GetClimberViewSet, CompetitionRegistrationViewSet, GetAthleteDetail, create_simple_athlete, PublicClimbers
)

router = DefaultRouter()
router.register(r'climbers', GetClimberViewSet)
router.register(r'public-climbers', PublicClimbers, basename='public-climber')
router.register(r'registrations', CompetitionRegistrationViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('<int:pk>/', GetAthleteDetail, name='athlete-detail'),
    path('create-simple-athlete/', create_simple_athlete, name='create_simple_athlete'),
]
