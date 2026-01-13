from django.urls import path
from . import views

urlpatterns = [
    path("", views.athletes, name="athletes"),
    path("<int:athlete_id>/", views.athlete_detail, name="athlete_detail"),
    path("admin/", views.admin_athletes, name="admin_athletes"),
    path(
        "admin/<int:climber_id>/",
        views.admin_athlete_detail,
        name="admin_athlete_detail",
    ),
    path("registrations/", views.registrations, name="registrations"),
    path(
        "registrations/<int:registration_id>/",
        views.registration_detail,
        name="registration_detail",
    ),
]
