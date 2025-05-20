from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GetClimberViewSet, CompetitionRegistrationViewSet, GetAthleteDetail
)

router = DefaultRouter()
router.register(r'climbers', GetClimberViewSet)
router.register(r'registrations', CompetitionRegistrationViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('<int:pk>/', GetAthleteDetail, name='athlete-detail'),
]
