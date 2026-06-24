from typing import Optional

from django.contrib.auth.models import User

from accounts import authorization
from accounts.models import CompetitionRole, Country, UserAccount

from . import types


def countries_get() -> list[Country]:
    """Get all countries"""
    return list(Country.objects.all().order_by("name_en"))


def user_account_list() -> list[types.UserAccountListItem]:
    users = (
        User.objects.select_related("profile")
        .filter(is_active=True, profile__deleted=False)
        .order_by("profile__full_name", "username")
    )

    result = []
    for u in users:
        profile = getattr(u, "profile", None)
        if profile:
            result.append(
                {
                    "id": profile.id,
                    "full_name": profile.full_name,
                    "email": u.email,
                    "username": u.username,
                }
            )

    return result


def user_profile_get(user: User) -> types.UserProfileResult:
    try:
        user_account = UserAccount.objects.get(user=user)
    except UserAccount.DoesNotExist:
        raise ValueError("User profile not found")

    return {
        "user": user,
        "user_account": user_account,
    }


def competition_role_list(
    *, user: User, competition_id: Optional[int] = None, role: Optional[str] = None
) -> list[CompetitionRole]:
    qs = CompetitionRole.objects.select_related("competition", "user__user")

    if competition_id:
        qs = qs.filter(competition_id=competition_id)

    if role:
        qs = qs.filter(role=role)

    if authorization.is_platform_admin(user):
        return list(qs)

    user_profile = getattr(user, "profile", None)
    if user_profile:
        return list(qs.filter(user=user_profile))

    return []


def competition_role_get(*, user: User, role_id: int) -> CompetitionRole:
    try:
        role = CompetitionRole.objects.select_related("competition", "user__user").get(
            id=role_id
        )
    except CompetitionRole.DoesNotExist:
        raise CompetitionRole.DoesNotExist("Role not found")

    if authorization.is_platform_admin(user):
        return role

    user_profile = getattr(user, "profile", None)
    if user_profile and role.user == user_profile:
        return role

    raise PermissionError("You do not have permission to view this role")
