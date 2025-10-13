from typing import Dict, Any, Optional
from datetime import date
from django.contrib.auth.models import User
from django.db import transaction, IntegrityError
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from google.oauth2 import id_token
from google.auth.transport import requests
from django.conf import settings
import logging, time, re


from .models import UserAccount, Country, CompetitionRole

logger = logging.getLogger(__name__)

def get_profile(user: User) -> Dict[str, Any]:
    """Get user profile data"""
    try:
        user_account = UserAccount.objects.get(user=user)
    except UserAccount.DoesNotExist:
        raise ValueError('User profile not found')

    token, _ = Token.objects.get_or_create(user=user)

    return {
        'user': user,
        'user_account': user_account,
        'token': token.key
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
        
        token, _ = Token.objects.get_or_create(user=user)
        
        return {
            'user': user,
            'user_account': user_account,
            'token': token.key
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
        token, _ = Token.objects.get_or_create(user=user)
        return {
            'user': user,
            'user_account': user_account,
            'token': token.key,
        }
    else:
        raise ValueError('Invalid email or password')

def register(
    username: str,
    email: str,
    password: str,
    password2: str,
    full_name: str,
    gender: str,
    date_of_birth: date,
    nationality: str,
    height_cm: int = None,
    wingspan_cm: int = None
) -> Dict[str, Any]:
    """Register a new user account"""
    
    if password != password2:
        raise ValueError('Passwords do not match')
    
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
                
                token, _ = Token.objects.get_or_create(user=existing_user)
                
                logger.info(f'User reactivated: {username} ({email})')
                
                return {
                    'user': existing_user,
                    'user_account': user_account,
                    'token': token.key,
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
        
        token = Token.objects.create(user=user)
        
        logger.info(f'User registered successfully: {username} ({email})')
        
        return {
            'user': user,
            'user_account': user_account,
            'token': token.key,
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
            
            token, _ = Token.objects.get_or_create(user=user)
            
            logger.info(f'Google login successful: {user.username} ({email}) - Created: {created}')
            
            return {
                'user': user,
                'user_account': user_account,
                'token': token.key,
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

def logout(user: User) -> None:
    """Logout user by deleting their auth token"""
    try:
        Token.objects.filter(user=user).delete()
        logger.info(f'User logged out: {user.username} ({user.email})')
    except Exception as e:
        logger.error(f'Error during logout for user {user.username}: {str(e)}')
        raise

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
