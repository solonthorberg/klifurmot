from typing import Dict, Any, Optional
from datetime import date, timedelta
import secrets
import hashlib
from django.core.mail import send_mail
from django.utils import timezone
from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.models import User
from django.db import transaction, IntegrityError
from django.contrib.auth import authenticate
from google.oauth2 import id_token
from google.auth.transport import requests
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
import logging, time, re


from .models import UserAccount, Country, CompetitionRole

logger = logging.getLogger(__name__)

def get_profile(user: User) -> Dict[str, Any]:
    """Get user profile data"""
    try:
        user_account = UserAccount.objects.get(user=user)
    except UserAccount.DoesNotExist:
        raise ValueError('User profile not found')


    return {
        'user': user,
        'user_account': user_account,
    }

def update_profile(
    user: User,
    full_name: Optional[str] = None,
    gender: Optional[str] = None,
    date_of_birth: Optional[date] = None,
    nationality: Optional[str] = None,
    height_cm: Optional[int] = None,
    wingspan_cm: Optional[int] = None,
    profile_picture = None
) -> Dict[str, Any]:
    """Update user profile"""
    
    with transaction.atomic():
        user_account, _ = UserAccount.objects.get_or_create(user=user)
        
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
            if profile_picture == '':
                if user_account.profile_picture:
                    user_account.profile_picture.delete(save=False)
                    user_account.profile_picture = None
            else:
                if user_account.profile_picture:
                    user_account.profile_picture.delete(save=False)
                user_account.profile_picture = profile_picture
        
        user_account.save()
        
        
        return {
            'user': user,
            'user_account': user_account,
        }

def login(
    email: str, 
    password: str
) -> Dict[str, any]:
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
        logger.error(f"UserAccount not found for user: {user.username}")
        user = None

    elapsed = time.time() - start_time
    min_time = 0.5
    if elapsed < min_time:
        time.sleep(min_time - elapsed)
        
    if user is not None and user.is_active:
        refresh = RefreshToken.for_user(user)
        
        return {
            'user': user,
            'user_account': user_account,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }
    else:
        raise ValueError('Invalid email or password')

def register(
    username: str,
    email: str,
    password: str,
    full_name: str,
    gender: str,
    date_of_birth: date,
    nationality: str,
    height_cm: int = None,
    wingspan_cm: int = None
) -> Dict[str, Any]:
    """Register a new user account"""
    
    try:
        validate_password(password)
    except DjangoValidationError as e:
        raise ValueError(', '.join(e.messages))
    
    with transaction.atomic():
        try:
            existing_user = User.objects.get(email__iexact=email)
            user_account = UserAccount.objects.get(user=existing_user)
            
            if user_account.deleted:
                user_account.deleted = False
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
                
                logger.info(f'User reactivated: {username} ({email})')
                
                return {
                    'user': existing_user,
                    'user_account': user_account,
                    'access': str(refresh.access_token),
                    'refresh': str(refresh),
                }
            else:
                raise IntegrityError('User already exists')
                
        except User.DoesNotExist:
            pass
        
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        
        nationality_obj = Country.objects.get(country_code=nationality)
        
        user_account = UserAccount.objects.create(
            user=user,
            full_name=full_name,
            gender=gender,
            date_of_birth=date_of_birth,
            nationality=nationality_obj,
            height_cm=height_cm,
            wingspan_cm=wingspan_cm
        )
        
        refresh = RefreshToken.for_user(user)
        
        logger.info(f'User registered successfully: {username} ({email})')
        
        return {
            'user': user,
            'user_account': user_account,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }


def google_login(google_token: str) -> Dict[str, Any]:
    """Handle Google OAuth login/registration"""
    
    try:
        idinfo = id_token.verify_oauth2_token(
            google_token,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=30
        )
        
        email = idinfo["email"].lower()
        full_name = idinfo.get("name", "")
        google_id = idinfo.get("sub")
        
        name_parts = full_name.strip().split() if full_name else []
        first_name = name_parts[0] if name_parts else ""
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""
        
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
                }
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
            
            logger.info(f'Google login successful: {user.username} ({email}) - Created: {created}')

            return {
                'user': user,
                'user_account': user_account,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            } 
    
    except ValueError as e:
        logger.error(f'Invalid Google token: {str(e)}')
        raise ValueError('Invalid Google token')
    
    except Exception as e:
        logger.error(f'Google login failed: {str(e)}')
        raise

def generate_unique_username(email: str, max_length: int = 150) -> str:
    """Generate a unique username from email"""
    base_username = email.split("@")[0]
    base_username = re.sub(r'[^a-zA-Z0-9_.-]', '', base_username)[:30]
    
    if not base_username:
        base_username = "user"
    
    if not User.objects.filter(username=base_username).exists():
        return base_username
    
    counter = 1
    while counter < 1000:
        candidate = f"{base_username}{counter}"
        if len(candidate) <= max_length and not User.objects.filter(username=candidate).exists():
            return candidate
        counter += 1
    
    import time
    timestamp = str(int(time.time()))[-6:]
    return f"{base_username[:20]}_{timestamp}"       

def logout(refresh_token: str) -> Dict[str, Any]:
    """Logout user by blacklisting their refresh token"""
    try:
        token = RefreshToken(refresh_token)
        token.blacklist()

        logger.info(f'User logged out successfully (token blacklisted)')

        return {
            'success': True,
            'message': 'Successfully logged out'
        }

    except TokenError as e:
        logger.warning(f'Logout failed with TokenError: {str(e)}')
        raise ValueError(f'Invalid or expired refresh token: {str(e)}')
    
    except Exception as e:
        logger.error(f'Unexpected error during logout: {str(e)}')
        raise ValueError(f'Logout failed: {str(e)}')

def get_competition_roles(
    user: User,
    competition_id: int = None,
    role: str = None
) -> Dict[str, Any]:
    """Get competition roles filtered by permissions"""
    qs = CompetitionRole.objects.select_related(
        'competition',
        'user__user'
    )
    
    if competition_id:
        qs = qs.filter(competition_id=competition_id)
    
    if role:
        qs = qs.filter(role=role)
    
    if user.is_staff or (hasattr(user, 'profile') and user.profile.is_admin):
        return {'roles': list(qs)}
    
    if hasattr(user, 'profile'):
        return {'roles': list(qs.filter(user=user.profile))}
    
    return {'roles': []}


def get_competition_role_by_id(
    user: User,
    role_id: int
) -> Dict[str, Any]:
    """Get a specific competition role by ID"""
    try:
        role = CompetitionRole.objects.select_related(
            'competition',
            'user__user'
        ).get(id=role_id)
    except CompetitionRole.DoesNotExist:
        raise CompetitionRole.DoesNotExist('Role not found')

    if user.is_staff or (hasattr(user, 'profile') and user.profile.is_admin):
        return {'role': role}
    
    if hasattr(user, 'profile') and role.user == user.profile:
        return {'role': role}
    
    raise PermissionError('You do not have permission to view this role')

def get_countries() -> Dict[str, Any]:
    """Get all countries"""
    countries = Country.objects.all().order_by('name_en')
    return {'countries': list(countries)}

def request_password_reset(email: str, request_ip: str = None) -> Dict[str, Any]:
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
                        f'Password reset rate limit exceeded for {email} from IP {request_ip}'
                    )
                    return {'success': True, 'message': 'If account exists, reset email sent'}
                
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
        
        reset_url = f"https://klifurmot.is/reset-password?token={token}"
        
        send_mail(
            subject='Password Reset Request',
            message=f'''
            You requested a password reset for your account.
            
            Click here to reset your password (valid for 1 hour):
            {reset_url}
            
            If you didn't request this, ignore this email.
            Your password won't change until you click the link above.
            
            For security, this link expires in 1 hour.
            ''',
            from_email='None',
            recipient_list=[email],
            fail_silently=False
        )
        
        logger.info(f'Password reset requested for {email} from IP {request_ip}')
        
    except User.DoesNotExist:
        logger.info(f'Password reset requested for non-existent email {email} from IP {request_ip}')
        pass
    
    except Exception as e:
        logger.error(f'Error in password reset request: {str(e)}')
        pass
    
    return {
        'success': True,
        'message': 'If an account exists with this email, you will receive reset instructions'
    }


def reset_password(token: str, new_password: str, request_ip: str = None) -> Dict[str, Any]:
    """Reset password with token"""
    
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    try:
        user_account = UserAccount.objects.get(reset_token_hash=token_hash)
        
        if not user_account.reset_token_created:
            raise ValueError('Invalid reset token')
        
        time_since_created = timezone.now() - user_account.reset_token_created
        if time_since_created > timedelta(hours=1):
            user_account.reset_token_hash = None
            user_account.reset_token_created = None
            user_account.save()
            raise ValueError('Reset token has expired')
        
        user = user_account.user
        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as e:
            raise ValueError(f"Password validation failed: {', '.join(e.messages)}")
        
        user.set_password(new_password)
        user.save()
        
        user_account.reset_token_hash = None
        user_account.reset_token_created = None
        user_account.reset_attempts = 0
        user_account.save()
        
        try:
            logout_all_sessions(user)
        except Exception as e:
            logger.error(f'Failed to logout all sessions during password reset: {str(e)}')
        
        send_mail(
            subject='Password Changed Successfully',
            message=f'''
            Your password was successfully changed.
            
            If you didn't make this change, please contact support immediately.
            
            Time: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}
            IP Address: {request_ip or 'Unknown'}
            ''',
            from_email='None',
            recipient_list=[user.email],
            fail_silently=True
        )
        
        logger.info(
            f'Password reset completed for user {user.username} ({user.email}) from IP {request_ip}'
        )
        
        return {
            'success': True,
            'message': 'Password reset successful. Please login with your new password.'
        }
        
    except UserAccount.DoesNotExist:
        logger.warning(f'Invalid password reset token attempted from IP {request_ip}')
        raise ValueError('Invalid or expired reset token')
    
    except Exception as e:
        logger.error(f'Error during password reset: {str(e)}')
        raise ValueError('Password reset failed')
