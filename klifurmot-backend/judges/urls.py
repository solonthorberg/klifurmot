from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()

urlpatterns = [
    path(
        "invitations/<int:competition_id>/",
        views.send_invitation,
        name="send-invitation",
    ),
    path(
        "invitations/validate/<uuid:token>/",
        views.validate_invitation,
        name="validate-invitation",
    ),
    path(
        "invitations/claim/<uuid:token>/",
        views.claim_invitation,
        name="claim-invitation",
    ),
    path(
        "invitations/competition/<int:competition_id>/",
        views.get_competition_invitations,
        name="get-competition-invitations",
    ),
    path(
        "links/competition/<int:competition_id>/",
        views.create_judge_link,
        name="create-judge-link",
    ),
    path("links/<uuid:token>/", views.validate_judge_link, name="validate-judge-link"),
    path(
        "links/<int:competition_id>/",
        views.get_competition_judge_links,
        name="get-competition-judge-links",
    ),
    path(
        "links/link/<int:link_id>/", views.manage_judge_link, name="manage-judge-link"
    ),
    path("all/<int:competition_id>/", views.get_all_judges, name="get-all-judges"),
    path("potential-judges/", views.get_potential_judges, name="potential-judges"),
]
