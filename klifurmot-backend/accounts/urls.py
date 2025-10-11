from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'countries', views.CountryViewSet)
router.register(r'user-accounts', views.UserAccountViewSet)
router.register(r'roles', views.CompetitionRoleViewSet)

urlpatterns = [
    path('me/', views.me, name='me'),
    path('', include(router.urls)),
    path('auth/login/', views.login, name='login'),
    path('auth/google-login/', views.google_login , name="google-login"),
    path('auth/register/', views.register, name='register'),
    path('auth/logout/', views.logout, name='logout'),
    
    path('judge-invitations/<int:competition_id>/', views.SendJudgeInvitationView.as_view(), name='send-judge-invitation'),
    path('judge-invitations/validate/<uuid:token>/', views.ValidateInvitation, name='validate-invitation'),
    path('judge-invitations/claim/<uuid:token>/', views.ClaimJudgeInvitation, name='claim-invitation'),
    path('judge-invitations/competition/<int:competition_id>/', views.GetCompetitionInvitations, name='get-competition-invitations'),
    
    path('judge-links/competition/<int:competition_id>/', views.CreateJudgeLink, name='create-judge-link'),
    path('judge-links/<uuid:token>/', views.ValidateJudgeToken, name='validate-judge-link'),
    path('judge-links/<int:competition_id>/', views.GetCompetitionJudgeLinks, name='get-competition-judge-links'),
    path('judge-links/link/<int:link_id>/', views.ManageJudgeLink, name='manage-judge-link'),
]
