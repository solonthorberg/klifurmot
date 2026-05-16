from django.urls import path
from . import views

urlpatterns = [
    path("", views.athletes, name="athletes"),
    path("<int:climber_id>/", views.athlete_detail, name="athlete_detail"),
    path("public/", views.public_athletes, name="public_athletes"),
    path(
        "public/<int:athlete_id>/",
        views.public_athlete_detail,
        name="public_athlete_detail",
    ),
    path("registrations/", views.registrations, name="registrations"),
    path(
        "registrations/<int:registration_id>/",
        views.registration_detail,
        name="registration_detail",
    ),
]
