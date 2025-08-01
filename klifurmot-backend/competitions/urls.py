from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    GetCompetitionViewSet, CategoryGroupViewSet, CompetitionCategoryViewSet,
    RoundViewSet, BoulderViewSet, JudgeBoulderAssignmentViewSet,
    AssignRoleView, GetCompetitionAthletes, GetCompetitionBoulders,
    GetCompetitionStartlist, GetCompetitionResults, RoundGroupViewSet,
    RegisterAthleteView, RemoveAthleteView, UpdateStartOrderView, GetUserCompetitionRoles, upload_image
)

router = DefaultRouter()
router.register(r'competitions', GetCompetitionViewSet, basename='competition')
router.register(r'category-groups', CategoryGroupViewSet)
router.register(r'competition-categories', CompetitionCategoryViewSet)
router.register(r'rounds', RoundViewSet, basename='round')
router.register(r'round-groups', RoundGroupViewSet)
router.register(r'boulders', BoulderViewSet)
router.register(r'judge-assignments', JudgeBoulderAssignmentViewSet)

urlpatterns = [
    path('competitions/<int:pk>/athletes/', GetCompetitionAthletes, name='competition-athletes'),
    path('competitions/<int:pk>/boulders/', GetCompetitionBoulders, name='competition-boulders'),
    path('competitions/<int:pk>/startlist/', GetCompetitionStartlist, name='competition-startlist'),
    path('competitions/<int:pk>/results/', GetCompetitionResults, name='competition-results'),
    path('<int:competition_id>/assign-role/', AssignRoleView.as_view(), name='assign-role'),
    path('register-athlete/', RegisterAthleteView.as_view(), name='register-athlete'),
    path('remove-athlete/', RemoveAthleteView, name='remove-athlete'),
    path('update-start-order/', UpdateStartOrderView.as_view(), name='update-start-order'),
    path('roles/', GetUserCompetitionRoles, name='user-competition-roles'),
    path('', include(router.urls)),
]