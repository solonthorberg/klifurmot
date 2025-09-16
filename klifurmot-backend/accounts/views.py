import logging
import re
import time
from django.db import IntegrityError
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.views import APIView
from django.contrib.auth import authenticate, get_user_model
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.utils.dateparse import parse_date
from django.utils import timezone
from google.oauth2 import id_token
from google.auth.transport import requests
from django.conf import settings
from django.db import transaction
from datetime import date
from django.contrib.auth.password_validation import validate_password
from .permissions import IsDjangoAdminOrReadOnly, IsAdmin

from competitions.models import Competition

from .models import Country, UserAccount, CompetitionRole, JudgeLink

from .serializers import (
    CountrySerializer, UserAccountSerializer, CompetitionRoleSerializer, UserSerializer
)

logger = logging.getLogger(__name__)
User = get_user_model()

def parse_expiration_date(expires_at_str):
    """Parse expiration date string to timezone-aware datetime"""
    try:
        return timezone.datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
    except (ValueError, AttributeError):
        raise ValueError("Invalid expiration date format")

User = get_user_model()

def SerializeUserResponse(user, token=None):
    profile = getattr(user, 'profile', None)
    return {
        "token": token.key if token else None,
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
        },
        "profile": {
            "full_name": profile.full_name if profile else None,
            "gender": profile.gender if profile else None,
            "date_of_birth": profile.date_of_birth if profile else None,
            "nationality": profile.nationality.country_code if profile and profile.nationality else None,
            "is_admin": profile.is_admin if profile else False,
            "height_cm": profile.height_cm if profile else None,
            "wingspan_cm": profile.wingspan_cm if profile else None,
            "profile_picture": (profile.profile_picture.url if profile and profile.profile_picture else None),
        } if profile else None
    }

class CountryViewSet(viewsets.ModelViewSet):
    queryset = Country.objects.all()
    serializer_class = CountrySerializer
    permission_classes = [IsDjangoAdminOrReadOnly]

class UserAccountViewSet(viewsets.ModelViewSet):
    queryset = UserAccount.objects.all()
    serializer_class = UserAccountSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return User.objects.all()
        return User.objects.filter(id=user.id)

class CompetitionRoleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CompetitionRole.objects.all()
    serializer_class = CompetitionRoleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return CompetitionRole.objects.all()
        if hasattr(self.request.user, 'profile'):
            return CompetitionRole.objects.filter(user=self.request.user.profile)
        return CompetitionRole.objects.none()

class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response(SerializeUserResponse(user, token))

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def Me(request):
    user = request.user
    
    if request.method == 'GET':
        token, _ = Token.objects.get_or_create(user=user)
        return Response(SerializeUserResponse(user, token))
    
    try:
        with transaction.atomic():
            data = request.data
            profile, created = UserAccount.objects.get_or_create(user=user)
            
            email = data.get('email')
            if email and email != user.email:
                if len(email) > 255:
                    return Response(
                        {'error': 'Email address is too long'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                try:
                    validate_email(email)
                    if User.objects.filter(email=email).exclude(id=user.id).exists():
                        return Response(
                            {'error': 'Email already exists'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    user.email = email
                except ValidationError:
                    return Response(
                        {'error': 'Invalid email format'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            full_name = data.get('full_name')
            if full_name is not None:
                full_name_stripped = full_name.strip()
                if not full_name_stripped:
                    return Response(
                        {'error': 'Full name cannot be empty'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if len(full_name_stripped) > 100:
                    return Response(
                        {'error': 'Full name cannot exceed 100 characters'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if any(ord(char) < 32 for char in full_name_stripped if char not in ['\n', '\t']):
                    return Response(
                        {'error': 'Full name contains invalid characters'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                profile.full_name = full_name_stripped
            
            gender = data.get('gender')
            if gender is not None:
                if gender not in ['KK', 'KVK']:
                    return Response(
                        {'error': 'Invalid gender value'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                profile.gender = gender
            
            dob = data.get('date_of_birth')
            if dob:
                try:
                    parsed_date = parse_date(dob)
                    if not parsed_date:
                        raise ValueError("Invalid date format")
                    if parsed_date > date.today():
                        return Response(
                            {'error': 'Date of birth cannot be in the future'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    min_date = date.today().replace(year=date.today().year - 100)
                    if parsed_date < min_date:
                        return Response(
                            {'error': 'Date of birth is too far in the past'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    profile.date_of_birth = parsed_date
                except (ValueError, TypeError):
                    return Response(
                        {'error': 'Invalid date format. Use YYYY-MM-DD'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            nationality = data.get('nationality')
            if nationality:
                if len(nationality) > 10:
                    return Response(
                        {'error': 'Invalid nationality code'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                try:
                    country = Country.objects.get(country_code=nationality)
                    profile.nationality = country
                except Country.DoesNotExist:
                    return Response(
                        {'error': 'Invalid nationality'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            height_cm = data.get('height_cm')
            if height_cm is not None:
                if height_cm == '' or height_cm is None:
                    profile.height_cm = None
                else:
                    try:
                        height_val = int(float(str(height_cm)))
                        if height_val < 50 or height_val > 300:
                            return Response(
                                {'error': 'Height must be between 50-300 cm'}, 
                                status=status.HTTP_400_BAD_REQUEST
                            )
                        profile.height_cm = height_val
                    except (ValueError, TypeError, OverflowError):
                        return Response(
                            {'error': 'Height must be a valid number'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
            
            wingspan_cm = data.get('wingspan_cm')
            if wingspan_cm is not None:
                if wingspan_cm == '' or wingspan_cm is None:
                    profile.wingspan_cm = None
                else:
                    try:
                        wingspan_val = int(float(str(wingspan_cm)))
                        if wingspan_val < 50 or wingspan_val > 400:
                            return Response(
                                {'error': 'Wingspan must be between 50-400 cm'}, 
                                status=status.HTTP_400_BAD_REQUEST
                            )
                        profile.wingspan_cm = wingspan_val
                    except (ValueError, TypeError, OverflowError):
                        return Response(
                            {'error': 'Wingspan must be a valid number'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
            
            if 'profile_picture' in request.data:
                if 'profile_picture' in request.FILES:
                    uploaded_file = request.FILES['profile_picture']
                    
                    if uploaded_file.size > 5 * 1024 * 1024:
                        return Response(
                            {'error': 'Image size cannot exceed 5MB'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    if not uploaded_file.content_type.startswith('image/'):
                        return Response(
                            {'error': 'Only image files are allowed'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp']
                    file_extension = uploaded_file.name.lower().split('.')[-1] if '.' in uploaded_file.name else ''
                    if f'.{file_extension}' not in allowed_extensions:
                        return Response(
                            {'error': 'Allowed file types: JPG, PNG, GIF, WebP'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    
                    if profile.profile_picture:
                        try:
                            profile.profile_picture.delete(save=False)
                        except Exception as e:
                            logger.warning(f"Failed to delete old profile picture: {str(e)}")
                    
                    profile.profile_picture = uploaded_file
                    
                elif request.data.get('profile_picture') == '':
                    if profile.profile_picture:
                        try:
                            profile.profile_picture.delete(save=False)
                            profile.profile_picture = None
                        except Exception as e:
                            logger.warning(f"Failed to delete profile picture: {str(e)}")
            
            profile.save()
            user.save()
            
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'success': True,
                'message': 'Profile updated successfully',
                'data': SerializeUserResponse(user, token)
            })
            
    except ValidationError as e:
        logger.warning(f"Validation error in profile update: {str(e)}")
        return Response(
            {'error': 'Please check your input and try again'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except IntegrityError as e:
        logger.error(f"Database integrity error in profile update: {str(e)}")
        return Response(
            {'error': 'Unable to save profile. Please check your data and try again'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        logger.error(f"Unexpected error in profile update: {str(e)}", exc_info=True)
        return Response(
            {'error': 'An error occurred while updating profile'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def Login(request):
    try:
        data = request.data
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        
        if not email or not password:
            return Response({"detail": "Missing credentials"}, status=400)
           
        if len(email) > 254 or len(password) > 128:
            return Response({"detail": "Invalid credentials"}, status=401)
       
        try:
            validate_email(email)
        except ValidationError:
            return Response({"detail": "Invalid credentials"}, status=401)
       
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
            return Response(SerializeUserResponse(user, token))
        
        return Response({"detail": "Invalid credentials"}, status=401)
       
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return Response({"detail": "An error occurred during login"}, status=500)

def generate_unique_username(email, max_length=150):
    """Generate a unique username, handling collisions"""
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

@api_view(["POST"])
@permission_classes([AllowAny])
def GoogleLogin(request):
    token_from_client = request.data.get("token")
    if not token_from_client:
        return Response({"detail": "Missing token"}, status=400)
   
    try:
        idinfo = id_token.verify_oauth2_token(
            token_from_client,
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
                base_username = email.split("@")[0][:30]
                username = base_username
               
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1
               
                user = User.objects.create(
                    email=email,
                    username=username,
                    first_name=first_name,
                    last_name=last_name,
                )
                created = True
           
            from .models import UserAccount
            profile, profile_created = UserAccount.objects.get_or_create(
                user=user,
                defaults={
                    "full_name": full_name,
                    "google_id": google_id,
                }
            )
           
            if not profile_created:
                if not profile.full_name and full_name:
                    profile.full_name = full_name
                if not profile.google_id and google_id:
                    profile.google_id = google_id
                profile.save()
       
        token, _ = Token.objects.get_or_create(user=user)
        return Response(SerializeUserResponse(user, token))
       
    except Exception as e:
        return Response({"detail": "Login failed"}, status=500)

@api_view(['POST'])
@permission_classes([AllowAny])
def Register(request):
    try:
        data = request.data
        username = data.get("username", "").strip()
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")
        password2 = data.get("password2", "")
        full_name = data.get("full_name", "").strip()
        
        if not all([username, email, password, password2, full_name]):
            return Response({"detail": "Missing required fields"}, status=400)
        
        if len(username) > 150:
            return Response({"detail": "Username too long"}, status=400)
        if len(full_name) > 100:
            return Response({"detail": "Full name too long"}, status=400)
        if len(email) > 254:
            return Response({"detail": "Email too long"}, status=400)
        
        if password != password2:
            return Response({"detail": "Passwords do not match"}, status=400)
            
        try:
            validate_password(password)
        except ValidationError as e:
            return Response({"detail": e.messages[0]}, status=400)
        
        try:
            validate_email(email)
        except ValidationError:
            return Response({"detail": "Invalid email address"}, status=400)
        
        if User.objects.filter(username__iexact=username).exists():
            return Response({"detail": "Username already exists"}, status=400)
        if User.objects.filter(email__iexact=email).exists():
            return Response({"detail": "Email already exists"}, status=400)
        
        gender = data.get('gender')
        if gender and gender not in ['KK', 'KVK']:
            return Response({"detail": "Invalid gender value"}, status=400)
        
        height_cm = data.get('height_cm')
        wingspan_cm = data.get('wingspan_cm')
        
        if height_cm:
            try:
                height_val = int(height_cm)
                if height_val < 50 or height_val > 300:
                    return Response({"detail": "Height must be between 50-300 cm"}, status=400)
            except (ValueError, TypeError):
                return Response({"detail": "Invalid height value"}, status=400)
        
        if wingspan_cm:
            try:
                wingspan_val = int(wingspan_cm)
                if wingspan_val < 50 or wingspan_val > 400:
                    return Response({"detail": "Wingspan must be between 50-400 cm"}, status=400)
            except (ValueError, TypeError):
                return Response({"detail": "Invalid wingspan value"}, status=400)
        
        date_of_birth = None
        if data.get('date_of_birth'):
            try:
                date_of_birth = parse_date(data.get('date_of_birth'))
                if not date_of_birth:
                    raise ValueError("Invalid date format")
                if date_of_birth > date.today():
                    return Response({"detail": "Date of birth cannot be in future"}, status=400)
            except (ValueError, TypeError):
                return Response({"detail": "Invalid date format. Use YYYY-MM-DD"}, status=400)
            
        nationality_obj = None
        if data.get('nationality'):
            try:
                nationality_obj = Country.objects.get(country_code=data.get('nationality'))
            except Country.DoesNotExist:
                return Response({"detail": "Invalid nationality"}, status=400)
        
        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                is_active=True
            )
            
            profile, _ = UserAccount.objects.get_or_create(
                user=user,
                defaults={
                    'full_name': full_name,
                    'gender': gender,
                    'date_of_birth': date_of_birth,
                    'nationality': nationality_obj,
                    'height_cm': int(height_cm) if height_cm else None,
                    'wingspan_cm': int(wingspan_cm) if wingspan_cm else None,
                }
            )
            
            token, _ = Token.objects.get_or_create(user=user)
            
        logger.info(f"New user registered: {username} ({email})")
        
        return Response(SerializeUserResponse(user, token), status=status.HTTP_201_CREATED)
        
    except IntegrityError as e:
        logger.error(f"Database error during registration: {str(e)}")
        return Response({"detail": "Registration failed"}, status=500)
    except Exception as e:
        logger.error(f"Unexpected error during registration: {str(e)}")
        return Response({"detail": "Registration failed"}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def Logout(request):
    Token.objects.filter(user=request.user).delete()
    return Response({"detail": "Successfully logged out."}, status=200)

class SendJudgeInvitationView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, competition_id):
        try:
            competition = Competition.objects.get(id=competition_id)
        except Competition.DoesNotExist:
            return Response({"detail": "Competition not found."}, status=404)
        
        user_account = getattr(request.user, 'profile', None)
        if not user_account or not user_account.is_admin:
            return Response({"detail": "Admin access required."}, status=403)
        
        email = request.data.get("email", "").strip().lower()
        name = request.data.get("name", "").strip()
        expires_at = request.data.get("expires_at")
        
        if not email or not expires_at:
            return Response({"detail": "Email and expires_at required."}, status=400)
        
        if len(email) > 254 or len(name) > 100:
            return Response({"detail": "Input too long."}, status=400)
        
        try:
            validate_email(email)
        except ValidationError:
            return Response({"detail": "Invalid email."}, status=400)
        
        try:
            expiration_dt = timezone.datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if expiration_dt <= timezone.now():
                raise ValueError("Past date")
            if expiration_dt > timezone.now() + timezone.timedelta(days=30):
                raise ValueError("Too far in future")
        except ValueError:
            return Response({"detail": "Invalid expiration date."}, status=400)
        
        existing_user = User.objects.filter(email__iexact=email).first()
        
        try:
            with transaction.atomic():
                if existing_user:
                    UserAccount.objects.get_or_create(user=existing_user)
                    
                    link, created = JudgeLink.objects.get_or_create(
                        user=existing_user,
                        competition=competition,
                        defaults={
                            "created_by": request.user,
                            "expires_at": expiration_dt
                        }
                    )
                    
                    if not created:
                        link.expires_at = expiration_dt
                        link.save()
                    
                    CompetitionRole.objects.get_or_create(
                        user=existing_user.profile,
                        competition=competition,
                        defaults={"role": "judge"}
                    )
                    
                    judge_url = f"{settings.FRONTEND_BASE_URL}/judge/login/{link.token}/"
                    link_type = "existing_user"
                    
                else:
                    existing_link = JudgeLink.objects.filter(
                        invited_email=email,
                        competition=competition,
                        claimed_at__isnull=True
                    ).first()
                    
                    if existing_link:
                        existing_link.expires_at = expiration_dt
                        existing_link.invited_name = name
                        existing_link.save()
                        link = existing_link
                        created = False
                    else:
                        link = JudgeLink.objects.create(
                            invited_email=email,
                            invited_name=name,
                            competition=competition,
                            expires_at=expiration_dt,
                            created_by=request.user
                        )
                        created = True
                    
                    judge_url = f"{settings.FRONTEND_BASE_URL}/judge/invite/{link.token}/"
                    link_type = "invitation"
                
                return Response({
                    "judge_link": judge_url,
                    "email": email,
                    "name": name,
                    "expires_at": link.expires_at,
                    "created": created,
                    "type": link_type,
                    "role_assigned": link_type == "existing_user"
                })
                
        except IntegrityError:
            return Response({"detail": "Database error occurred."}, status=500)
        except Exception:
            return Response({"detail": "An error occurred."}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def ValidateInvitation(request, token):
    try:
        link = JudgeLink.objects.get(token=token)
        
        if link.expires_at < timezone.now() or link.claimed_at:
            return Response({"detail": "Invalid or expired invitation."}, status=400)
        
        return Response({
            "valid": True,
            "competition_id": link.competition.id,
            "competition_title": link.competition.title,
            "invited_email": link.invited_email,
            "invited_name": link.invited_name
        })
    except JudgeLink.DoesNotExist:
        return Response({"detail": "Invalid or expired invitation."}, status=400)

@api_view(['POST'])
@permission_classes([AllowAny])
def ClaimJudgeInvitation(request, token):
    try:
        with transaction.atomic():
            link = JudgeLink.objects.select_for_update().get(token=token)

            if link.expires_at < timezone.now() or link.claimed_at:
                return Response({"detail": "Invalid or expired invitation."}, status=400)
            
            if not request.user.is_authenticated:
                return Response({
                    "authenticated": False,
                    "requires_auth": True,
                    "invitation_valid": True,
                    "competition_title": link.competition.title,
                    "invited_name": link.invited_name
                }, status=401)
            
            if link.invited_email and request.user.email.lower() != link.invited_email.lower():
                return Response({
                    "detail": "This invitation is for a different email address."
                }, status=403)
            
            link.claimed_by = request.user
            link.claimed_at = timezone.now()
            link.user = request.user
            link.is_used = True
            link.invited_email = None
            link.invited_name = None
            link.save()
            
            user_account, _ = UserAccount.objects.get_or_create(user=request.user)
            CompetitionRole.objects.get_or_create(
                user=user_account,
                competition=link.competition,
                defaults={"role": "judge"}
            )
            
            return Response({
                "success": True,
                "detail": "Invitation claimed successfully",
                "competition_id": link.competition.id
            })
            
    except JudgeLink.DoesNotExist:
        return Response({"detail": "Invalid or expired invitation."}, status=400)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ValidateJudgeToken(request, token):
    try:
        link = JudgeLink.objects.get(token=token)
        
        if link.expires_at < timezone.now():
            return Response({"detail": "Link expired."}, status=400)
        
        if link.user and link.user != request.user:
            if not (hasattr(request.user, 'profile') and request.user.profile.is_admin):
                return Response({"detail": "Access denied."}, status=403)
        
        return Response({
            "competition_id": link.competition.id,
            "competition_title": link.competition.title,
            "user_id": link.user.id if link.user else None,
            "user_email": link.user.email if link.user else None,
        })
        
    except JudgeLink.DoesNotExist:
        return Response({"detail": "Invalid token."}, status=404) 

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def GetCompetitionJudgeLinks(request, competition_id):
    user_account = getattr(request.user, 'profile', None)
    if not user_account:
        return Response({"detail": "No user profile found."}, status=403)
    
    try:
        competition = Competition.objects.get(id=competition_id)
    except Competition.DoesNotExist:
        return Response({"detail": "Competition not found."}, status=404)
    
    if not user_account.is_admin:
        is_competition_admin = CompetitionRole.objects.filter(
            user=user_account,
            competition=competition,
            role='admin'
        ).exists()
        if not is_competition_admin:
            return Response({"detail": "Access denied."}, status=403)
    
    judge_links = JudgeLink.objects.filter(
        competition=competition,
        user__isnull=False
    ).select_related('user__profile').order_by('-created_at')
    
    links_data = []
    for link in judge_links:
        is_expired = link.expires_at < timezone.now()
        
        links_data.append({
            "id": link.id,
            "user_id": link.user.id,
            "user_name": getattr(link.user.profile, 'full_name', None) or link.user.username,
            "status": "expired" if is_expired else ("used" if link.is_used else "active"),
            "expires_at": link.expires_at,
            "created_at": link.created_at,
        })
    
    return Response(links_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def GetCompetitionInvitations(request, competition_id):
    user_account = getattr(request.user, 'profile', None)
    if not user_account:
        return Response({"detail": "No user profile found."}, status=403)
    
    try:
        competition = Competition.objects.get(id=competition_id)
    except Competition.DoesNotExist:
        return Response({"detail": "Competition not found."}, status=404)
    
    if not user_account.is_admin:
        is_competition_admin = CompetitionRole.objects.filter(
            user=user_account,
            competition=competition,
            role='admin'
        ).exists()
        if not is_competition_admin:
            return Response({"detail": "Access denied."}, status=403)
    
    invitation_links = JudgeLink.objects.filter(
        competition=competition,
        invited_email__isnull=False
    ).select_related('claimed_by', 'competition').order_by('-created_at')
    
    links_data = []
    for link in invitation_links:
        is_expired = link.expires_at < timezone.now()
        is_claimed = bool(link.claimed_at)
        
        links_data.append({
            "id": link.id,
            "type": "invitation",
            "invited_name": link.invited_name,
            "status": "expired" if is_expired else ("claimed" if is_claimed else "pending"),
            "expires_at": link.expires_at,
            "claimed_at": link.claimed_at,
            "created_at": link.created_at,
        })
    
    return Response(links_data)

@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def ManageJudgeLink(request, link_id):
    user_account = getattr(request.user, 'profile', None)
    if not user_account:
        return Response({"detail": "No user profile found."}, status=403)
    
    try:
        judge_link = JudgeLink.objects.select_related('competition').get(id=link_id)
    except JudgeLink.DoesNotExist:
        return Response({"detail": "Judge link not found."}, status=404)
    
    if not user_account.is_admin:
        is_competition_admin = CompetitionRole.objects.filter(
            user=user_account,
            competition=judge_link.competition,
            role='admin'
        ).exists()
        if not is_competition_admin:
            return Response({"detail": "Access denied."}, status=403)
    
    if request.method == 'PATCH':
        expires_at = request.data.get("expires_at")
        if not expires_at:
            return Response({"detail": "expires_at is required."}, status=400)
        
        try:
            expiration_dt = timezone.datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            if expiration_dt <= timezone.now():
                raise ValueError("Past date")
            if expiration_dt > timezone.now() + timezone.timedelta(days=30):
                raise ValueError("Too far in future")
        except ValueError:
            return Response({"detail": "Invalid expiration date."}, status=400)
        
        judge_link.expires_at = expiration_dt
        judge_link.save()
        
        return Response({
            "id": judge_link.id,
            "expires_at": judge_link.expires_at,
            "detail": "Judge link updated successfully."
        })
    
    elif request.method == 'DELETE':
        judge_link.delete()
        return Response({"detail": "Judge link deleted successfully."}, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def CreateJudgeLink(request, competition_id):
    user_account = getattr(request.user, 'profile', None)
    if not user_account:
        return Response({"detail": "No user profile found."}, status=403)
    
    try:
        competition = Competition.objects.get(id=competition_id)
    except Competition.DoesNotExist:
        return Response({"detail": "Competition not found."}, status=404)
    
    if not user_account.is_admin:
        is_competition_admin = CompetitionRole.objects.filter(
            user=user_account,
            competition=competition,
            role='admin'
        ).exists()
        if not is_competition_admin:
            return Response({"detail": "Access denied."}, status=403)
    
    user_id = request.data.get("user_id")
    expires_at = request.data.get("expires_at")
    
    if not user_id or not expires_at:
        return Response({"detail": "user_id and expires_at are required."}, status=400)
    
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=404)
    
    try:
        expiration_dt = timezone.datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        if expiration_dt <= timezone.now():
            raise ValueError("Past date")
        if expiration_dt > timezone.now() + timezone.timedelta(days=30):
            raise ValueError("Too far in future")
    except ValueError:
        return Response({"detail": "Invalid expiration date."}, status=400)
    
    try:
        with transaction.atomic():
            link, created = JudgeLink.objects.get_or_create(
                user=target_user,
                competition=competition,
                defaults={
                    "created_by": request.user,
                    "expires_at": expiration_dt
                }
            )
            
            if not created:
                link.expires_at = expiration_dt
                link.save()
            
            target_user_account, _ = UserAccount.objects.get_or_create(user=target_user)
            role, role_created = CompetitionRole.objects.get_or_create(
                user=target_user_account,
                competition=competition,
                defaults={"role": "judge"}
            )
            
        return Response({
            "created": created,
            "role_assigned": True,
            "role_created": role_created,
            "expires_at": link.expires_at,
            "detail": f"Judge link {'created' if created else 'updated'}"
        }, status=201 if created else 200)
        
    except IntegrityError:
        return Response({
            "detail": "Unable to create judge link. Please try again."
        }, status=500)
