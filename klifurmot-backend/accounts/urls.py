from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CountryViewSet, UserAccountViewSet, CompetitionRoleViewSet, 
    Me, Login, GoogleLogin, Register, Logout, UserViewSet, SendJudgeLinkView, 
    ValidateJudgeToken, GetCompetitionJudgeLinks, ManageJudgeLink
)

router = DefaultRouter()
router.register(r'countries', CountryViewSet)
router.register(r'user-accounts', UserAccountViewSet)
router.register(r'roles', CompetitionRoleViewSet)
router.register(r'users', UserViewSet)

urlpatterns = [
    path('me/', Me, name='me'),
    path('', include(router.urls)),
    path('login/', Login, name='login'),
    path("google-login/", GoogleLogin, name="google-login"),
    path('register/', Register, name='register'),
    path('logout/', Logout, name='logout'),
    path('judge-links/<int:competition_id>/', SendJudgeLinkView.as_view(), name='send-judge-link'),
    path('judge-links/<uuid:token>/', ValidateJudgeToken, name='validate-judge-link'),
    path('judge-links/competition/<int:competition_id>/', GetCompetitionJudgeLinks, name='get-competition-judge-links'),
    path('judge-links/link/<int:link_id>/', ManageJudgeLink, name='manage-judge-link'),
]