from typing import Dict, Any, Optional
from datetime import date
from django.contrib.auth.models import User
from django.db import transaction, IntegrityError
from rest_framework.authtoken.models import Token
import logging, time

from .models import UserAccount, Country

logger = logging.getLogger(__name__)

def login(
    email: str, 
    password: str
) -> Dict[str, any]:
    """Login for a user"""
    start_time = time.time()
    user = None
    try:
        user_obj = User.objects.get(email__iexact=email)
            
        user = authenticate(request, username=user_obj.username, password=password)
            
    except User.DoesNotExist:
        authenticate(request, username="nonexistent_user", password=password)

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
