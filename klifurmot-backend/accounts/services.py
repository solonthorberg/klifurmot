import hashlib
import logging
import re
import secrets
import textwrap
import time
from datetime import date, timedelta
from typing import Any, Dict, Optional, cast
from PIL import Image as PilImage
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile
import sys

from django.conf import settings
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from google.auth.transport import requests
from google.oauth2 import id_token
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .models import CompetitionRole, Country, UserAccount

logger = logging.getLogger(__name__)


async def send_email_via_resend(to: str, subject: str, body: str) -> None:
    import httpx

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.DEFAULT_FROM_EMAIL,
                "to": [to],
                "subject": subject,
                "text": body,
            },
            timeout=10,
        )
        if response.status_code not in (200, 201):
            logger.error(f"Resend API error: {response.status_code} {response.text}")
            raise Exception(f"Failed to send email: {response.status_code}")


def compress_profile_picture(uploaded_file):
    img = PilImage.open(uploaded_file)

    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    img.thumbnail((400, 400), PilImage.Resampling.LANCZOS)

    output = BytesIO()
    img.save(output, format="JPEG", quality=85, optimize=True)
    output.seek(0)

    return InMemoryUploadedFile(
        output,
        "ImageField",
        f"{uploaded_file.name.split('.')[0]}.jpg",
        "image/jpeg",
        sys.getsizeof(output),
        None,
    )


def list_user_accounts() -> list[dict]:
    users = (
        User.objects.select_related("profile")
        .filter(is_active=True)
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


def get_profile(user: User) -> Dict[str, Any]:
    """Get user profile data"""
    try:
        user_account = UserAccount.objects.get(user=user)
    except UserAccount.DoesNotExist:
        raise ValueError("User profile not found")

    return {
        "user": user,
        "user_account": user_account,
    }


def update_profile(
    user: User,
    username: Optional[str] = None,
    full_name: Optional[str] = None,
    gender: Optional[str] = None,
    date_of_birth: Optional[date] = None,
    nationality: Optional[str] = None,
    height_cm: Optional[int] = None,
    wingspan_cm: Optional[int] = None,
    profile_picture=None,
) -> Dict[str, Any]:
    """Update user profile"""

    with transaction.atomic():
        user_account, _ = UserAccount.objects.get_or_create(user=user)

        if username is not None and username != user.username:
            taken = (
                User.objects.filter(username__iexact=username)
                .exclude(pk=user.pk)
                .exists()
            )
            if taken:
                raise ValueError("Username is already taken")
            user.username = username
            user.save(update_fields=["username"])

        if full_name is not None:
            user_account.full_name = full_name

        if gender is not None:
            user_account.gender = gender

        if date_of_birth is not None:
            user_account.date_of_birth = date_of_birth

        if nationality is not None:
            nationality_obj = Country.objects.get(country_code=nationality)
            user_account.nationality = nationality_obj

        if height_cm is not None:
            user_account.height_cm = height_cm

        if wingspan_cm is not None:
            user_account.wingspan_cm = wingspan_cm

        if profile_picture is not None:
            if profile_picture == "":
                if user_account.profile_picture:
                    user_account.profile_picture.delete(save=False)
                setattr(user_account, "profile_picture", None)
            else:
                if user_account.profile_picture:
                    user_account.profile_picture.delete(save=False)
                user_account.profile_picture = compress_profile_picture(profile_picture)  # pyright: ignore[reportAttributeAccessIssue]

        user_account.save()

        return {
            "user": user,
            "user_account": user_account,
        }


def login(email: str, password: str) -> Dict[str, Any]:
    """Login for a user"""
    start_time = time.time()
    user = None

    try:
        user_obj = User.objects.get(email__iexact=email)
        user = authenticate(username=user_obj.username, password=password)

        if user is not None and user.is_active:
            user_account = UserAccount.objects.get(user=user)

            if user_account.deleted:
                user = None

    except User.DoesNotExist:
        authenticate(username="nonexistent_user", password=password)

    except UserAccount.DoesNotExist:
        logger.error(f"UserAccount not found for user: {user_obj.username}")
        user = None

    elapsed = time.time() - start_time
    min_time = 0.5
    if elapsed < min_time:
        time.sleep(min_time - elapsed)

    if user is not None and user.is_active:
        refresh = RefreshToken.for_user(user)

        return {
            "user": user,
            "user_account": user_account,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }
    else:
        raise ValueError("Invalid email or password")


def register(
    username: str,
    email: str,
    password: str,
    full_name: str,
    gender: str,
    date_of_birth,
    nationality: str,
    height_cm: Optional[int] = None,
    wingspan_cm: Optional[int] = None,
) -> Dict[str, Any]:
    try:
        existing_user = User.objects.get(email__iexact=email)

        if existing_user.is_active:
            raise IntegrityError("User already exists")

        user_account = UserAccount.objects.get(user=existing_user)

        with transaction.atomic():
            user_account.full_name = full_name
            user_account.gender = gender
            user_account.date_of_birth = date_of_birth
            user_account.nationality = Country.objects.get(country_code=nationality)
            user_account.height_cm = height_cm
            user_account.wingspan_cm = wingspan_cm
            user_account.save()

            existing_user.set_password(password)
            existing_user.username = username
            existing_user.save()

            refresh = RefreshToken.for_user(existing_user)
            logger.info(f"User reactivated: {username} ({email})")

            return {
                "user": existing_user,
                "user_account": user_account,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }

    except User.DoesNotExist:
        pass

    user = User.objects.create_user(username=username, email=email, password=password)

    nationality_obj = Country.objects.get(country_code=nationality)

    user_account = UserAccount.objects.create(
        user=user,
        full_name=full_name,
        gender=gender,
        date_of_birth=date_of_birth,
        nationality=nationality_obj,
        height_cm=height_cm,
        wingspan_cm=wingspan_cm,
    )

    refresh = RefreshToken.for_user(user)
    logger.info(f"User registered successfully: {username} ({email})")

    return {
        "user": user,
        "user_account": user_account,
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


def google_login(google_token: str) -> Dict[str, Any]:
    """Handle Google OAuth login/registration"""

    try:
        idinfo = id_token.verify_oauth2_token(
            google_token,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=30,
        )

        email = idinfo["email"].lower()
        full_name = idinfo.get("name", "")
        google_id = idinfo.get("sub")

        with transaction.atomic():
            try:
                user = User.objects.get(email__iexact=email)
                created = False

            except User.DoesNotExist:
                username = generate_unique_username(email)

                user = User.objects.create(
                    email=email,
                    username=username,
                )
                created = True

            user_account, profile_created = UserAccount.objects.get_or_create(
                user=user,
                defaults={
                    "full_name": full_name,
                    "google_id": google_id,
                },
            )

            if user_account.deleted:
                user_account.deleted = False
                user_account.full_name = full_name
                user_account.google_id = google_id
                user_account.save()

            if not profile_created and not user_account.deleted:
                if not user_account.full_name and full_name:
                    user_account.full_name = full_name
                if not user_account.google_id and google_id:
                    user_account.google_id = google_id
                user_account.save()

            refresh = RefreshToken.for_user(user)

            logger.info(
                f"Google login successful: {user.username} ({email}) - Created: {created}"
            )

            return {
                "user": user,
                "user_account": user_account,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }

    except ValueError as e:
        logger.error(f"Invalid Google token: {str(e)}")
        raise ValueError("Invalid Google token")

    except Exception as e:
        logger.error(f"Google login failed: {str(e)}")
        raise


def generate_unique_username(email: str, max_length: int = 150) -> str:
    """Generate a unique username from email"""
    base_username = email.split("@")[0]
    base_username = re.sub(r"[^a-zA-Z0-9_.-]", "", base_username)[:30]

    if not base_username:
        base_username = "user"

    if not User.objects.filter(username=base_username).exists():
        return base_username

    counter = 1
    while counter < 1000:
        candidate = f"{base_username}{counter}"
        if (
            len(candidate) <= max_length
            and not User.objects.filter(username=candidate).exists()
        ):
            return candidate
        counter += 1

    import time

    timestamp = str(int(time.time()))[-6:]
    return f"{base_username[:20]}_{timestamp}"


def logout(request, refresh_token_str) -> Dict[str, Any]:
    """Logout user by blacklisting their refresh token"""
    try:
        token = RefreshToken(refresh_token_str)
        token.blacklist()

        logger.info("User logged out successfully (token blacklisted)")

        return {"success": True, "message": "Successfully logged out"}

    except TokenError as e:
        logger.warning(f"Logout failed with TokenError: {str(e)}")
        raise ValueError(f"Invalid or expired refresh token: {str(e)}")

    except Exception as e:
        logger.error(f"Unexpected error during logout: {str(e)}")
        raise ValueError(f"Logout failed: {str(e)}")


def refresh_token(refresh_token_str) -> Dict[str, Any]:
    try:
        token = RefreshToken(refresh_token_str)
        user_id = token["user_id"]
        user = User.objects.get(id=user_id)

        profile = getattr(user, "profile", None)
        if not profile or profile.deleted:
            token.blacklist()
            raise ValueError("Account is inactive")

        token.blacklist()
        new_token = RefreshToken.for_user(user)
        return {
            "access": str(new_token.access_token),
            "refresh": str(new_token),
        }
    except TokenError as e:
        raise ValueError(f"Invalid or expired refresh token: {str(e)}")


def get_competition_roles(
    user: User, competition_id: Optional[int] = None, role: Optional[str] = None
) -> Dict[str, Any]:
    """Get competition roles filtered by permissions"""
    qs = CompetitionRole.objects.select_related("competition", "user__user")

    if competition_id:
        qs = qs.filter(competition_id=competition_id)

    if role:
        qs = qs.filter(role=role)

    user_profile = getattr(user, "profile", None)

    if user.is_staff or (user_profile and user_profile.is_admin):
        return {"roles": list(qs)}

    if user_profile:
        return {"roles": list(qs.filter(user=user_profile))}

    return {"roles": []}


def get_competition_role_by_id(user: User, role_id: int) -> Dict[str, Any]:
    """Get a specific competition role by ID"""
    try:
        role = CompetitionRole.objects.select_related("competition", "user__user").get(
            id=role_id
        )
    except CompetitionRole.DoesNotExist:
        raise CompetitionRole.DoesNotExist("Role not found")

    user_profile = getattr(user, "profile", None)

    if user.is_staff or (user_profile and user_profile.is_admin):
        return {"role": role}

    if user_profile and role.user == user_profile:
        return {"role": role}

    raise PermissionError("You do not have permission to view this role")


def get_countries() -> Dict[str, Any]:
    """Get all countries"""
    countries = Country.objects.all().order_by("name_en")
    return {"countries": list(countries)}


def request_password_reset(
    email: str, request_ip: Optional[str] = None
) -> Dict[str, Any]:
    """Request password reset - Always returns success to prevent email enumeration"""

    try:
        user = User.objects.get(email__iexact=email.lower())
        user_account = UserAccount.objects.get(user=user)

        now = timezone.now()
        if user_account.last_reset_attempt:
            time_since_last = now - user_account.last_reset_attempt

            if time_since_last < timedelta(hours=1):
                if user_account.reset_attempts >= 3:
                    logger.warning(
                        f"Password reset rate limit exceeded for {email} from IP {request_ip}"
                    )
                    return {
                        "success": True,
                        "message": "If account exists, reset email sent",
                    }

                user_account.reset_attempts += 1
            else:
                user_account.reset_attempts = 1
        else:
            user_account.reset_attempts = 1

        user_account.last_reset_attempt = now

        token = secrets.token_urlsafe(32)

        token_hash = hashlib.sha256(token.encode()).hexdigest()

        user_account.reset_token_hash = token_hash
        user_account.reset_token_created = now
        user_account.save()

        reset_url = f"{settings.FRONTEND_BASE_URL}/reset-password?token={token}"

        send_email_via_resend(
            to=email,
            subject="Beiðni um að breyta lykilorði",
            body=textwrap.dedent(f"""
                Þú baðst um að breyta lykilorði.
                
                Smelltu hér til að breyta lykilorði (gildir í 1 klukkustund):
                {reset_url}
                
                Ef þú baðst ekki um að breyta lykilorðinu þínu, hunsaðu þennan tölvupóst.

                Kveðja,
                klifurmot.is
            """).strip(),
        )

        logger.info(f"Password reset requested for {email} from IP {request_ip}")

    except User.DoesNotExist:
        logger.info(
            f"Password reset requested for non-existent email {email} from IP {request_ip}"
        )
        pass

    except Exception as e:
        logger.error(f"Error in password reset request: {str(e)}")
        pass

    return {
        "success": True,
        "message": "If an account exists with this email, you will receive reset instructionas",
    }


def reset_password(
    token: str, new_password: str, request_ip: Optional[str] = None
) -> Dict[str, Any]:
    """Reset password with token"""

    token_hash = hashlib.sha256(token.encode()).hexdigest()

    try:
        user_account = UserAccount.objects.get(reset_token_hash=token_hash)

        if not user_account.reset_token_created:
            raise ValueError("Invalid reset token")

        time_since_created = timezone.now() - user_account.reset_token_created
        if time_since_created > timedelta(hours=1):
            user_account.reset_token_hash = None
            user_account.reset_token_created = None
            user_account.save()
            raise ValueError("Reset token has expired")

        user = user_account.user
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as e:
            error_messages = [str(msg) for msg in e.messages]
            raise ValueError(f"Password validation failed: {', '.join(error_messages)}")

        user.set_password(new_password)
        user.save()

        user_account.reset_token_hash = None
        user_account.reset_token_created = None
        user_account.reset_attempts = 0
        user_account.save()

        try:
            logout_all_sessions(user)
        except Exception as e:
            logger.error(
                f"Failed to logout all sessions during password reset: {str(e)}"
            )

        send_email_via_resend(
            to=user.email,
            subject="Lykilorði hefur verið breytt",
            body=textwrap.dedent(f"""
                Lykilorði hefur verið breytt.
                
                Ef þetta varst ekki þú hafðu samband strax.
                
                Tími: {timezone.now().strftime("%Y-%m-%d %H:%M:%S UTC")}
                IP-tala: {request_ip or "Óþekkt"}

                Kveðja,
                klifurmot.is
            """).strip(),
        )

        logger.info(
            f"Password reset completed for user {user.username} ({user.email}) from IP {request_ip}"
        )

        return {
            "success": True,
            "message": "Password reset successful. Please login with your new password.",
        }

    except UserAccount.DoesNotExist:
        logger.warning(f"Invalid password reset token attempted from IP {request_ip}")
        raise ValueError("Invalid or expired reset token")

    except Exception as e:
        logger.error(f"Error during password reset: {str(e)}")
        raise ValueError("Password reset failed")


def logout_all_sessions(user: User) -> None:
    """Invalidate all active sessions for a user by blacklisting all refresh tokens"""

    from rest_framework_simplejwt.token_blacklist.models import (
        BlacklistedToken,
        OutstandingToken,
    )

    tokens = OutstandingToken.objects.filter(user_id=user.pk)
    already_blacklisted = set(
        BlacklistedToken.objects.filter(token__in=tokens).values_list(
            "token_id", flat=True
        )
    )
    for token in tokens:
        if token.pk not in already_blacklisted:
            RefreshToken(cast(Any, token.token)).blacklist()

    logger.info(f"All sessions terminated for user: {user.username}")
