from typing import Dict, List

from django.contrib.auth.models import User
from django.utils import timezone

from accounts.authorization import require_competition_admin
from competitions.models import Competition
from judges.models import JudgeLink
from . import types


def competition_invitations_get(
    competition_id: int, user: User
) -> Dict[str, List[types.CompetitionInvitationsResult]]:
    try:
        competition = Competition.objects.get(id=competition_id)
    except Competition.DoesNotExist:
        raise ValueError("Competition not found")

    require_competition_admin(user, competition.pk)

    invitation_links = (
        JudgeLink.objects.filter(competition=competition, type="invitation")
        .select_related("claimed_by", "competition")
        .order_by("-created_at")
    )

    invitations = []
    for link in invitation_links:
        is_expired = link.expires_at < timezone.now()
        is_claimed = bool(link.claimed_at)
        invitations.append(
            types.CompetitionInvitationsResult(
                id=link.pk,
                type="invitation",
                invited_email=link.invited_email,
                invited_name=link.invited_name,
                status="expired"
                if is_expired
                else ("claimed" if is_claimed else "pending"),
                expires_at=link.expires_at,
                claimed_at=link.claimed_at,
                created_at=link.created_at,
                token=str(link.token),
            )
        )

    return {"invitations": invitations}


def judge_link_validate(token: str, user: User) -> types.JudgeLinkValidateResult:
    """Validate a judge link token"""

    try:
        link = JudgeLink.objects.get(token=token)
    except JudgeLink.DoesNotExist:
        raise JudgeLink.DoesNotExist("Invalid token")

    if link.expires_at < timezone.now():
        raise ValueError("Link expired")

    if link.user and link.user != user:
        user_account = getattr(user, "profile", None)
        if not user_account or not user_account.is_admin:
            raise PermissionError("Access denied")

    return types.JudgeLinkValidateResult(competition=link.competition, judge_link=link)


def competition_judge_links_get(
    competition_id: int, user: User
) -> Dict[str, List[types.CompetitionJudgeLinkResult]]:
    try:
        competition = Competition.objects.get(id=competition_id)
    except Competition.DoesNotExist:
        raise ValueError("Competition not found")

    require_competition_admin(user, competition.pk)

    judge_links = (
        JudgeLink.objects.filter(competition=competition, type="link")
        .select_related("user__profile")
        .order_by("-created_at")
    )

    links = []
    for link in judge_links:
        assert link.user is not None
        is_expired = link.expires_at < timezone.now()
        links.append(
            types.CompetitionJudgeLinkResult(
                id=link.pk,
                type="link",
                user_id=link.user.id,
                user_email=link.user.email,
                user_name=getattr(link.user.profile, "full_name", None)
                or link.user.username,
                status="expired"
                if is_expired
                else ("used" if link.is_used else "active"),
                expires_at=link.expires_at,
                created_at=link.created_at,
                token=str(link.token),
            )
        )

    return {"links": links}


def potential_judges_get() -> Dict[str, List[types.PotentialJudgesResult]]:
    """Get list of users who can be assigned as judges for a competition"""

    users = (
        User.objects.select_related("profile")
        .filter(is_active=True)
        .order_by("profile__full_name", "username")
    )

    judges_list = []
    for u in users:
        profile = getattr(u, "profile", None)

        if profile:
            judges_list.append(
                types.PotentialJudgesResult(
                    id=u.pk,
                    full_name=profile.full_name,
                    email=u.email,
                    username=u.username,
                )
            )

    return {"judges": judges_list}
