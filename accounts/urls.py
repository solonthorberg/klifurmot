from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CountryViewSet, UserAccountViewSet, CompetitionRoleViewSet, 
    me, login, google_login, register, logout, UserViewSet, SendJudgeLinkView, 
    validate_judge_token, get_competition_judge_links, manage_judge_link
)

router = DefaultRouter()
router.register(r'countries', CountryViewSet)
router.register(r'users', UserAccountViewSet)
router.register(r'roles', CompetitionRoleViewSet)
router.register(r'users', UserViewSet)

urlpatterns = [
    path('me/', me, name='me'),
    path('', include(router.urls)),
    path('login/', login, name='login'),
    path("google-login/", google_login, name="google-login"),
    path('register/', register, name='register'),
    path('logout/', logout, name='logout'),
    path('judge-links/<int:competition_id>/', SendJudgeLinkView.as_view(), name='send-judge-link'),
    path('judge-links/<uuid:token>/', validate_judge_token, name='validate-judge-link'),
    path('judge-links/competition/<int:competition_id>/', get_competition_judge_links, name='get-competition-judge-links'),
    path('judge-links/link/<int:link_id>/', manage_judge_link, name='manage-judge-link'),
]