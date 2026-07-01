import logging
from typing import Optional
from django.db import transaction
from django.contrib.auth.models import User
from django.utils import timezone

from . import types

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
) -> types.SendJudgeInvitationResult:
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
            role_assigned, _ = CompetitionRole.objects.get_or_create(
                user=user_account_target,
                competition=competition,
                role="judge",
            )

            return types.SendJudgeInvitationResult(
                judge_link=judge_link,
                type="existing_user",
                created=created,
                role_assigned=role_assigned,
            )

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
                return types.SendJudgeInvitationResult(
                    judge_link=existing_invitation,
                    type="updated_invitation",
                    created=False,
                    role_assigned=None,
                )
            except JudgeLink.DoesNotExist:
                judge_link = JudgeLink.objects.create(
                    type="invitation",
                    competition=competition,
                    invited_email=email,
                    invited_name=name or email.split("@")[0],
                    created_by=user,
                    expires_at=expires_at,
                )
                return types.SendJudgeInvitationResult(
                    judge_link=judge_link,
                    type="new_user",
                    created=True,
                    role_assigned=None,
                )


def validate_invitation(token: str) -> types.ValidateInvitationResult:
    """Validate a judge invitation token"""

    try:
        link = JudgeLink.objects.get(token=token)
    except JudgeLink.DoesNotExist:
        raise JudgeLink.DoesNotExist("Invalid or expired invitation")

    if link.expires_at < timezone.now() or link.claimed_at:
        raise ValueError("Invalid or expired invitation")

    return types.ValidateInvitationResult(
        competition=link.competition,
        invited_email=link.invited_email,
        invited_name=link.invited_name,
    )


def claim_invitation(
    token: str, user: Optional[User] = None
) -> types.ClaimInvitationTrueResult | types.ClaimInvitationFalseResult:
    try:
        link = JudgeLink.objects.get(token=token)
    except JudgeLink.DoesNotExist:
        raise ValueError("Invalid or expired invitation")

    if link.expires_at < timezone.now() or link.claimed_at:
        raise ValueError("Invalid or expired invitation")

    if not user:
        return types.ClaimInvitationFalseResult(
            authenticated=False,
            requires_auth=True,
            invitation_valid=True,
            competition_title=link.competition.title,
            invited_name=link.invited_name,
        )

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
            user=user_account, competition=link.competition, role="judge"
        )

        return types.ClaimInvitationTrueResult(
            authenticated=True, competition_id=link.competition.id
        )


def create_judge_link(
    competition_id: int, user: User, user_id: int
) -> types.CreateJudgeLinkResult:
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

        role_assigned, _ = CompetitionRole.objects.get_or_create(
            user=user_account_target,
            competition=competition,
            role="judge",
        )

        return types.CreateJudgeLinkResult(
            judge_link=judge_link,
            created=created,
            role_assigned=role_assigned,
        )


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
