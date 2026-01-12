from django.urls import path
from . import views

urlpatterns = [
    path("climbs/", views.climbs, name="climbs"),
    path("climbs/<int:climb_id>/", views.climb_detail, name="climb_detail"),
    path("startlist/", views.startlist, name="startlist"),
    path("startlist/<int:result_id>/", views.startlist_detail, name="startlist_detail"),
    path("scores/", views.scores, name="scores"),
    path(
        "rounds/<int:round_id>/advance/",
        views.advance_climbers,
        name="advance_climbers",
    ),
]
