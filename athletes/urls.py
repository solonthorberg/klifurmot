from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import ClimberViewSet, CompetitionRegistrationViewSet

router = DefaultRouter()
router.register(r'climbers', ClimberViewSet)
router.register(r'registrations', CompetitionRegistrationViewSet)

urlpatterns = [
    path('', include(router.urls))
]