from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CompetitionViewSet, CategoryGroupViewSet, CompetitionCategoryViewSet,
    RoundViewSet, BoulderViewSet, JudgeBoulderAssignmentViewSet,
    AssignRoleView
)

router = DefaultRouter()
router.register(r'competitions', CompetitionViewSet)
router.register(r'category-groups', CategoryGroupViewSet)
router.register(r'competition-categories', CompetitionCategoryViewSet)
router.register(r'rounds', RoundViewSet, basename='round')
router.register(r'boulders', BoulderViewSet)
router.register(r'judge-assignments', JudgeBoulderAssignmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('<int:competition_id>/assign-role/', AssignRoleView.as_view(), name='assign-role'),

]
