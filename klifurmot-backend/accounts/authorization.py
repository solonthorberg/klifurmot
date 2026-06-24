from .models import CompetitionRole


def is_competition_admin(user, competition_id) -> bool:
    profile = getattr(user, "profile", None)
    if not profile:
        return False
    if profile.is_admin:
        return True
    return CompetitionRole.objects.filter(
        user=profile, competition_id=competition_id, role="admin"
    ).exists()


def is_competition_judge(user, competition_id) -> bool:
    profile = getattr(user, "profile", None)
    if not profile:
        return False
    if profile.is_admin:
        return True
    return CompetitionRole.objects.filter(
        user=profile, competition_id=competition_id, role__in=["judge", "admin"]
    ).exists()


def require_competition_admin(
    user, competition_id, message: str = "Competition admin access required"
) -> None:
    if not is_competition_admin(user, competition_id):
        raise PermissionError(message)


def require_competition_judge(
    user, competition_id, message: str = "Judge access required"
) -> None:
    if not is_competition_judge(user, competition_id):
        raise PermissionError(message)


def is_platform_admin(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    profile = getattr(user, "profile", None)
    return bool(profile and profile.is_admin)
