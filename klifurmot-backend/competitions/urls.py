from django.urls import path
from . import views

urlpatterns = [
    path("", views.competitions, name="competitions"),
    path("<int:competition_id>/", views.competition_detail, name="competition_detail"),
    path(
        "<int:competition_id>/athletes/",
        views.competition_athletes,
        name="competition_athletes",
    ),
    path(
        "<int:competition_id>/boulders/",
        views.competition_boulders,
        name="competition_boulders",
    ),
    path(
        "<int:competition_id>/startlist/",
        views.competition_startlist,
        name="competition_startlist",
    ),
    path(
        "<int:competition_id>/results/",
        views.competition_results,
        name="competition_results",
    ),
    path("<int:competition_id>/rounds/", views.create_round, name="create_round"),
    path("rounds/", views.list_rounds, name="list_rounds"),
    path("rounds/<int:round_id>/", views.round_detail, name="round_detail"),
    path("rounds/<int:round_id>/status/", views.round_status, name="round_status"),
    path("round-groups/", views.round_groups, name="round_groups"),
    path("categories/", views.categories, name="categories"),
    path(
        "categories/<int:category_id>/", views.category_detail, name="category_detail"
    ),
    path("category-groups/", views.category_groups, name="category_groups"),
]
