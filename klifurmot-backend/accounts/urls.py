from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'countries', views.CountryViewSet)

urlpatterns = [
    path('me/', views.me, name='me'),
    path('', include(router.urls)),
    path('auth/login/', views.login, name='login'),
    path('auth/google-login/', views.google_login , name="google-login"),
    path('auth/register/', views.register, name='register'),
    path('auth/logout/', views.logout, name='logout'),
]    
