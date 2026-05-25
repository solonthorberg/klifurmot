import logging
from typing import Dict, Any, Optional
from django.db import transaction
from django.contrib.auth.models import User
from django.utils import timezone

from .models import JudgeLink
from accounts.models import UserAccount, CompetitionRole
from competitions.models import Competition
from accounts.authorization import require_competition_admin

logger = logging.getLogger(__name__)


def send_judge_invitation(
    competition_id: int,
    user: User,
    email: str,
    name: str = "",
) -> Dict[str, Any]:
    email = email.lower().strip()
    name = (name or "").strip()

    try:
        competition = Competition.objects.get(id=competition_id)
    except Competition.DoesNotExist:
        raise ValueError("Competition not found")

    require_competition_admin(user, competition.pk)

    expires_at = competition.end_date
    with transaction.atomic():
        try:
            existing_user = User.objects.get(email__iexact=email)
            user_account_target, _ = UserAccount.objects.get_or_create(
                user=existing_user
            )
            judge_link, created = JudgeLink.objects.get_or_create(
                user=existing_user,
                competition=competition,
                defaults={"type": "link", "created_by": user, "expires_at": expires_at},
            )
            if not created:
                judge_link.expires_at = expires_at
                judge_link.save()
            role_assigned = CompetitionRole.objects.get_or_create(
                user=user_account_target,
                competition=competition,
                defaults={"role": "judge"},
            )
            return {
                "judge_link": judge_link,
                "type": "existing_user",
                "created": created,
                "role_assigned": role_assigned,
            }
        except User.DoesNotExist:
            try:
                existing_invitation = JudgeLink.objects.get(
                    invited_email=email,
                    competition=competition,
                    claimed_at__isnull=True,
                )
                existing_invitation.invited_name = name
                existing_invitation.expires_at = expires_at
                existing_invitation.save()
                return {
                    "judge_link": existing_invitation,
                    "type": "updated_invitation",
                    "created": False,
                    "role_assigned": False,
                }
            except JudgeLink.DoesNotExist:
                judge_link = JudgeLink.objects.create(
                    type="invitation",
                    competition=competition,
                    invited_email=email,
                    invited_name=name or email.split("@")[0],
                    created_by=user,
                    expires_at=expires_at,
                )
                return {
                    "judge_link": judge_link,
                    "type": "new_user",
                    "created": True,
                    "role_assigned": False,
                }


def validate_invitation(token: str) -> Dict[str, Any]:
    """Validate a judge invitation token"""

    try:
        link = JudgeLink.objects.get(token=token)
    except JudgeLink.DoesNotExist:
        raise JudgeLink.DoesNotExist("Invalid or expired invitation")

    if link.expires_at < timezone.now() or link.claimed_at:
        raise ValueError("Invalid or expired invitation")

    return {
        "competition": link.competition,
        "invited_email": link.invited_email,
        "invited_name": link.invited_name,
    }


def claim_invitation(token: str, user: Optional[User] = None) -> Dict[str, Any]:
    try:
        link = JudgeLink.objects.get(token=token)
    except JudgeLink.DoesNotExist:
        raise ValueError("Invalid or expired invitation")

    if link.expires_at < timezone.now() or link.claimed_at:
        raise ValueError("Invalid or expired invitation")

    if not user:
        return {
            "authenticated": False,
            "requires_auth": True,
            "invitation_valid": True,
            "competition_title": link.competition.title,
            "invited_name": link.invited_name,
        }

    if link.type == "link" and link.user != user:
        raise PermissionError("This link is for a different user")

    if link.invited_email and user.email.lower() != link.invited_email.lower():
        raise PermissionError("This invitation is for a different email address")

    with transaction.atomic():
        link = JudgeLink.objects.select_for_update().get(token=token)

        if link.claimed_at:
            raise ValueError("Invitation already claimed")

        link.claimed_by = user
        link.claimed_at = timezone.now()
        link.user = user
        link.is_used = True
        link.type = "link"
        link.save()

        user_account, _ = UserAccount.objects.get_or_create(user=user)
        CompetitionRole.objects.get_or_create(
            user=user_account, competition=link.competition, defaults={"role": "judge"}
        )

        return {"authenticated": True, "competition_id": link.competition.id}


def get_competition_invitations(competition_id: int, user: User) -> Dict[str, Any]:
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
            {
                "id": link.pk,
                "type": "invitation",
                "invited_email": link.invited_email,
                "invited_name": link.invited_name,
                "status": "expired"
                if is_expired
                else ("claimed" if is_claimed else "pending"),
                "expires_at": link.expires_at,
                "claimed_at": link.claimed_at,
                "created_at": link.created_at,
                "token": str(link.token),
            }
        )

    return {"invitations": invitations}


def create_judge_link(competition_id: int, user: User, user_id: int) -> Dict[str, Any]:
    try:
        competition = Competition.objects.get(id=competition_id)
    except Competition.DoesNotExist:
        raise ValueError("Competition not found")

    require_competition_admin(user, competition.pk)

    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise ValueError("User not found")

    expires_at = competition.end_date
    with transaction.atomic():
        judge_link, created = JudgeLink.objects.get_or_create(
            user=target_user,
            competition=competition,
            defaults={"type": "link", "expires_at": expires_at, "created_by": user},
        )
        if not created:
            judge_link.expires_at = expires_at
            judge_link.save()
        user_account_target, _ = UserAccount.objects.get_or_create(user=target_user)
        role_assigned = CompetitionRole.objects.get_or_create(
            user=user_account_target,
            competition=competition,
            defaults={"role": "judge"},
        )
        return {
            "judge_link": judge_link,
            "created": created,
            "role_assigned": role_assigned,
        }


def validate_judge_link(token: str, user: User) -> Dict[str, Any]:
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

    return {"competition": link.competition, "judge_link": link}


def get_competition_judge_links(competition_id: int, user: User) -> Dict[str, Any]:
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
            {
                "id": link.pk,
                "type": "link",
                "user_id": link.user.id,
                "user_email": link.user.email,
                "user_name": getattr(link.user.profile, "full_name", None)
                or link.user.username,
                "status": "expired"
                if is_expired
                else ("used" if link.is_used else "active"),
                "expires_at": link.expires_at,
                "created_at": link.created_at,
                "token": str(link.token),
            }
        )

    return {"links": links}


def delete_judge_link(link_id: int, user: User) -> None:
    try:
        judge_link = JudgeLink.objects.select_related(
            "competition", "user__profile"
        ).get(id=link_id)
    except JudgeLink.DoesNotExist:
        raise ValueError("Judge link not found")

    require_competition_admin(user, judge_link.competition.pk)

    with transaction.atomic():
        if judge_link.user:
            judge_user_account = getattr(judge_link.user, "profile", None)
            if judge_user_account:
                CompetitionRole.objects.filter(
                    user=judge_user_account,
                    competition=judge_link.competition,
                    role="judge",
                ).delete()

        judge_link.delete()


def get_potential_judges() -> Dict[str, Any]:
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
                {
                    "id": u.pk,
                    "full_name": profile.full_name,
                    "email": u.email,
                    "username": u.username,
                }
            )

    return {"judges": judges_list}
