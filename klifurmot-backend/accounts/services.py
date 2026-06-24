import hashlib
import logging
import secrets
import textwrap
import time
from datetime import date, timedelta
from typing import Any, Dict, Optional, cast

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

from . import selectors
from . import types
from core.email import send_email_via_resend
from core.images import compress_image

from .models import Country, UserAccount

logger = logging.getLogger(__name__)


def list_user_accounts() -> list[types.UserAccountListItem]:
    return selectors.user_account_list()


def get_profile(user: User) -> types.UserProfileResult:
    """Get user profile data"""
    return selectors.user_profile_get(user)


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
) -> types.UserProfileResult:

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
                user_account.profile_picture = compress_image(  # pyright: ignore[reportAttributeAccessIssue]
                    profile_picture, max_size=(400, 400)
                )

        user_account.save()

        return {
            "user": user,
            "user_account": user_account,
        }


def login(email: str, password: str) -> types.AuthResult:
    start_time = time.time()

    try:
        username = User.objects.get(email__iexact=email).username
    except User.DoesNotExist:
        username = "nonexistent_user"

    user = authenticate(username=username, password=password)

    user_account = None
    if user is not None and user.is_active:
        try:
            user_account = UserAccount.objects.get(user=user)
        except UserAccount.DoesNotExist:
            logger.error(f"UserAccount not found for user: {user.username}")

    valid = (
        user is not None
        and user.is_active
        and user_account is not None
        and not user_account.deleted
    )

    elapsed = time.time() - start_time
    min_time = 0.5
    if elapsed < min_time:
        time.sleep(min_time - elapsed)

    if not valid:
        raise ValueError("Invalid email or password")

    assert isinstance(user, User) and user_account is not None
    refresh = RefreshToken.for_user(user)

    return {
        "user": user,
        "user_account": user_account,
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


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
) -> types.AuthResult:
    if User.objects.filter(email__iexact=email).exists():
        raise IntegrityError("User already exists")

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


def google_login(google_token: str) -> types.AuthResult:
    """Handle Google OAuth login/registration"""

    try:
        idinfo = id_token.verify_oauth2_token(
            google_token,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=30,
        )
        email = idinfo["email"].lower()
        google_id = idinfo.get("sub")

        with transaction.atomic():
            try:
                user = User.objects.get(email__iexact=email)
            except User.DoesNotExist:
                raise ValueError(
                    "No account found with this Google email. Please register first."
                )

            try:
                user_account = UserAccount.objects.get(user=user)
            except UserAccount.DoesNotExist:
                raise ValueError(
                    "No profile found for this account. Please contact support."
                )

            if user_account.deleted:
                raise ValueError("This account has been deleted.")

            if not user_account.google_id and google_id:
                user_account.google_id = google_id
                user_account.save()

            refresh = RefreshToken.for_user(user)

            logger.info(f"Google login successful: {user.username} ({email})")

            return {
                "user": user,
                "user_account": user_account,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            }

    except ValueError as e:
        logger.error(f"Google login failed: {str(e)}")
        raise

    except Exception as e:
        logger.error(f"Google login failed: {str(e)}")
        raise


def logout(request, refresh_token_str) -> str:
    """Logout user by blacklisting their refresh token"""
    try:
        token = RefreshToken(refresh_token_str)
        token.blacklist()

        logger.info("User logged out successfully (token blacklisted)")
        return "Successfully logged out"

    except TokenError as e:
        logger.warning(f"Logout failed with TokenError: {str(e)}")
        raise ValueError(f"Invalid or expired refresh token: {str(e)}")

    except Exception as e:
        logger.error(f"Unexpected error during logout: {str(e)}")
        raise ValueError(f"Logout failed: {str(e)}")


def refresh_token(refresh_token_str) -> types.TokenPair:
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


def request_password_reset(email: str, request_ip: Optional[str] = None) -> str:
    """Request password reset - Always returns success to prevent email enumeration"""
    message = (
        "If an account exists with this email, you will receive reset instructions"
    )

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
                    return message

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
                
                Smelltu hér til að breyta lykilorði (gildir í korter):
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

    return message


def reset_password(
    token: str, new_password: str, request_ip: Optional[str] = None
) -> str:
    """Reset password with token"""

    token_hash = hashlib.sha256(token.encode()).hexdigest()

    try:
        user_account = UserAccount.objects.get(reset_token_hash=token_hash)

        if not user_account.reset_token_created:
            raise ValueError("Invalid reset token")

        time_since_created = timezone.now() - user_account.reset_token_created
        if time_since_created > timedelta(minutes=15):
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

        return "Password reset successful. Please login with your new password."

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
