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


from .models import UserAccount, Country

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
    full_name: str,
    username: str,
    email: str,
    password: str,
    gender: Optional[str] = None,
    date_of_birth: Optional[date] = None,
    nationality: Optional[str] = None,
    height_cm: Optional[int] = None,
    wingspan_cm: Optional[int] = None
) -> Dict[str, Any]:
    """Register a new user both for django user and UserAccount"""
    
    nationality_obj = Country.objects.get(country_code=nationality)
    
    try:
        with transaction.atomic():
            # Create Django user
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                is_active=True
            )
            
            # Create user profile
            user_account = UserAccount.objects.create(
                user=user,
                full_name=full_name,
                gender=gender if gender else None,
                date_of_birth=date_of_birth,
                nationality=nationality_obj,
                height_cm=height_cm if height_cm else None,
                wingspan_cm=wingspan_cm if wingspan_cm else None,
            )
            
            token, _ = Token.objects.get_or_create(user=user)
        
        logger.info(f'User registered successfully: {username} ({email})')
        
        return {
            'user': user,
            'user_account': user_account,
            'token': token.key,
        }
        
    except IntegrityError as e:
        logger.error(f'IntegrityError during registration for {username}: {str(e)}')
        raise
    except Country.DoesNotExist as e:
        logger.error(f'Country not found for {nationality}: {str(e)}')
    except Exception as e:
        logger.error(f'Unexpected error during registration: {str(e)}')
        raise

def google_login(google_token: str) -> Dict[str, Any]:
    """Handle Google OAuth login/registration"""
    
    try:
        # Verify Google token
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
            # Try to get existing user
            try:
                user = User.objects.get(email__iexact=email)
                created = False
            except User.DoesNotExist:
                # Generate unique username
                username = generate_unique_username(email)
                
                # Create new user
                user = User.objects.create(
                    email=email,
                    username=username,
                )
                created = True
            
            # Get or create UserAccount
            user_account, profile_created = UserAccount.objects.get_or_create(
                user=user,
                defaults={
                    "full_name": full_name,
                    "google_id": google_id,
                }
            )
            
            # Update profile if needed
            if not profile_created:
                if not user_account.full_name and full_name:
                    user_account.full_name = full_name
                if not user_account.google_id and google_id:
                    user_account.google_id = google_id
                user_account.save()
            
            # Get or create token
            token, _ = Token.objects.get_or_create(user=user)
            
            logger.info(f'Google login successful: {username} ({email}) - Created: {created}')
            
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
