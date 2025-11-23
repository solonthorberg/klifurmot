import logging
from typing import Dict, Any, Optional
from django.db import transaction
from django.contrib.auth.models import User
from django.utils import timezone

from .models import JudgeLink
from accounts.models import UserAccount, CompetitionRole
from competitions.models import Competition

logger = logging.getLogger(__name__)


def send_judge_invitation(
    competition_id: int,
    user: User,
    email: str,
    expires_at: timezone.datetime,
    name: str = "",
) -> Dict[str, Any]:
    """Send a judge invitation via link"""

    email = email.lower().strip()
    name = (name or "").strip()

    user_account = getattr(user, "profile", None)
    if not user_account:
        raise PermissionError("No user profile found")

    try:
        competition = Competition.objects.get(id=competition_id)
    except Competition.DoesNotExist:
        raise Competition.DoesNotExist("Competition not found")

    if not user_account.is_admin:
        is_competition_admin = CompetitionRole.objects.filter(
            user=user_account, competition=competition, role="admin"
        ).exists()
        if not is_competition_admin:
            raise PermissionError(
                "You do not have permission to manage judges for this competition"
            )

    with transaction.atomic():
        try:
            existing_user = User.objects.get(email__iexact=email)
            user_account_target, _ = UserAccount.objects.get_or_create(
                user=existing_user
            )

            judge_link, created = JudgeLink.objects.get_or_create(
                user=existing_user,
                competition=competition,
                defaults={"type": "link", "expires_at": expires_at, "created_by": user},
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
                    expires_at=expires_at,
                    created_by=user,
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
    """Claim a judge invitation"""

    try:
        link = JudgeLink.objects.get(token=token)
    except JudgeLink.DoesNotExist:
        raise JudgeLink.DoesNotExist("Invalid or expired invitation")

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
    """Get all invitations for a competition"""

    user_account = getattr(user, "profile", None)
    if not user_account:
        raise PermissionError("No user profile found")

    try:
        competition = Competition.objects.get(id=competition_id)
    except Competition.DoesNotExist:
        raise Competition.DoesNotExist("Competition not found")

    if not user_account.is_admin:
        is_competition_admin = CompetitionRole.objects.filter(
            user=user_account, competition=competition, role="admin"
        ).exists()
        if not is_competition_admin:
            raise PermissionError(
                "You do not have permission to view invitations for this competition"
            )

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
                "id": link.id,
                "type": "invitation",
                "invited_email": link.invited_email,
                "invited_name": link.invited_name,
                "status": "expired"
                if is_expired
                else ("claimed" if is_claimed else "pending"),
                "expires_at": link.expires_at,
                "claimed_at": link.claimed_at,
                "created_at": link.created_at,
            }
        )

    return {"invitations": invitations}


def create_judge_link(
    competition_id: int, user: User, user_id: int, expires_at: timezone.datetime
) -> Dict[str, Any]:
    """Create a judge link for an existing user"""

    user_account = getattr(user, "profile", None)
    if not user_account:
        raise PermissionError("No user profile found")

    try:
        competition = Competition.objects.get(id=competition_id)
    except Competition.DoesNotExist:
        raise Competition.DoesNotExist("Competition not found")

    if not user_account.is_admin:
        is_competition_admin = CompetitionRole.objects.filter(
            user=user_account, competition=competition, role="admin"
        ).exists()
        if not is_competition_admin:
            raise PermissionError(
                "You do not have permission to manage judges for this competition"
            )

    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        raise User.DoesNotExist("User not found")

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
    """Get all judge links for a competition"""

    user_account = getattr(user, "profile", None)
    if not user_account:
        raise PermissionError("No user profile found")

    try:
        competition = Competition.objects.get(id=competition_id)
    except Competition.DoesNotExist:
        raise Competition.DoesNotExist("Competition not found")

    if not user_account.is_admin:
        is_competition_admin = CompetitionRole.objects.filter(
            user=user_account, competition=competition, role="admin"
        ).exists()
        if not is_competition_admin:
            raise PermissionError(
                "You do not have permission to view judges for this competition"
            )

    judge_links = (
        JudgeLink.objects.filter(competition=competition, type="link")
        .select_related("user__profile")
        .order_by("-created_at")
    )

    links = []
    for link in judge_links:
        is_expired = link.expires_at < timezone.now()

        links.append(
            {
                "id": link.id,
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
            }
        )

    return {"links": links}


def update_judge_link(
    link_id: int, user: User, expires_at: timezone.datetime
) -> Dict[str, Any]:
    """Update a judge link expiration date"""

    user_account = getattr(user, "profile", None)
    if not user_account:
        raise PermissionError("No user profile found")

    try:
        judge_link = JudgeLink.objects.select_related("competition").get(id=link_id)
    except JudgeLink.DoesNotExist:
        raise JudgeLink.DoesNotExist("Judge link not found")

    if not user_account.is_admin:
        is_competition_admin = CompetitionRole.objects.filter(
            user=user_account, competition=judge_link.competition, role="admin"
        ).exists()
        if not is_competition_admin:
            raise PermissionError(
                "You do not have permission to manage this judge link"
            )

    judge_link.expires_at = expires_at
    judge_link.save()

    return {"judge_link": judge_link}


def delete_judge_link(link_id: int, user: User) -> None:
    """Delete a judge link"""

    user_account = getattr(user, "profile", None)
    if not user_account:
        raise PermissionError("No user profile found")

    try:
        judge_link = JudgeLink.objects.select_related("competition").get(id=link_id)
    except JudgeLink.DoesNotExist:
        raise JudgeLink.DoesNotExist("Judge link not found")

    if not user_account.is_admin:
        is_competition_admin = CompetitionRole.objects.filter(
            user=user_account, competition=judge_link.competition, role="admin"
        ).exists()
        if not is_competition_admin:
            raise PermissionError(
                "You do not have permission to manage this judge link"
            )

    judge_link.delete()


def get_potential_judges(user: User) -> Dict[str, Any]:
    """Get list of users who can be assigned as judges for a competition"""

    user_account = getattr(user, "profile", None)
    if not user_account:
        raise PermissionError("No user profile found")

    if not user_account.is_admin:
        raise PermissionError("Only admins can view potential judges")

    users = (
        User.objects.select_related("profile")
        .filter(is_active=True)
        .order_by("profile__full_name", "username")
    )

    judges_list = []
    for u in users:
        if hasattr(u, "profile"):
            judges_list.append(
                {
                    "id": u.id,
                    "full_name": u.profile.full_name,
                    "email": u.email,
                    "username": u.username,
                }
            )

    return {"judges": judges_list}
