from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomAuthToken, CountryViewSet, UserAccountViewSet, CompetitionRoleViewSet
from .views import me, login, register, logout, UserViewSet, SendJudgeLinkView

router = DefaultRouter()
router.register(r'countries', CountryViewSet)
router.register(r'users', UserAccountViewSet)
router.register(r'roles', CompetitionRoleViewSet)
router.register(r'users', UserViewSet)

urlpatterns = [
    path('login/', login, name='login'),
    path('me/', me, name='me'),
    path('', include(router.urls)),
    path('register/', register, name='register'),
    path('logout/', logout, name='logout'),
    path('judge-links/<int:competition_id>/', SendJudgeLinkView.as_view(), name='send-judge-link'),
]