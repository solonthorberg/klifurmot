from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CountryViewSet, UserAccountViewSet, CompetitionRoleViewSet,
    Me, Login, GoogleLogin, Register, Logout, UserViewSet,
    SendJudgeInvitationView, ValidateInvitation, ClaimJudgeInvitation,
    ValidateJudgeToken, GetCompetitionJudgeLinks, ManageJudgeLink,
    GetCompetitionInvitations, CreateJudgeLink,
)

router = DefaultRouter()
router.register(r'countries', CountryViewSet)
router.register(r'user-accounts', UserAccountViewSet)
router.register(r'roles', CompetitionRoleViewSet)
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('me/', Me, name='me'),
    path('', include(router.urls)),
    path('login/', Login, name='login'),
    path("google-login/", GoogleLogin, name="google-login"),
    path('register/', Register, name='register'),
    path('logout/', Logout, name='logout'),
    
    path('judge-invitations/<int:competition_id>/', SendJudgeInvitationView.as_view(), name='send-judge-invitation'),
    path('judge-invitations/validate/<uuid:token>/', ValidateInvitation, name='validate-invitation'),
    path('judge-invitations/claim/<uuid:token>/', ClaimJudgeInvitation, name='claim-invitation'),
    path('judge-invitations/competition/<int:competition_id>/', GetCompetitionInvitations, name='get-competition-invitations'),
    
    path('judge-links/competition/<int:competition_id>/', CreateJudgeLink, name='create-judge-link'),
    path('judge-links/<uuid:token>/', ValidateJudgeToken, name='validate-judge-link'),
    path('judge-links/<int:competition_id>/', GetCompetitionJudgeLinks, name='get-competition-judge-links'),
    path('judge-links/link/<int:link_id>/', ManageJudgeLink, name='manage-judge-link'),
]
