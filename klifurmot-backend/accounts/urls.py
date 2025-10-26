from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
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
    path('auth/refresh/', TokenRefreshView.as_view()),

    path('auth/password-reset/', views.request_password_reset, name='password-reset-request'),
    path('auth/password-reset/confirm/', views.reset_password, name='password-reset-confirm'),
]
