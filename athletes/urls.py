from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClimberViewSet, CompetitionRegistrationViewSet, AthleteDetail
)

router = DefaultRouter()
router.register(r'climbers', ClimberViewSet)
router.register(r'registrations', CompetitionRegistrationViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('<int:pk>/', AthleteDetail, name='athlete-detail'),
]
