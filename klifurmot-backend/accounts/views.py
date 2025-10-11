import logging
import re
import time
from django.db import IntegrityError
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.authentication import TokenAuthentication
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.views.decorators.csrf import csrf_exempt
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
from .permissions import IsDjangoAdminOrReadOnly, IsAdmin, IsCompetitionAdmin
from core.utils import success_response, error_response, validation_error_response

from . import services
from . import serializers

from competitions.models import Competition

from .models import Country, UserAccount, CompetitionRole, JudgeLink


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
    serializer_class = serializers.CountrySerializer
    permission_classes = [IsDjangoAdminOrReadOnly]

class UserAccountViewSet(viewsets.ModelViewSet):
    queryset = UserAccount.objects.all()
    serializer_class = serializers.UserAccountSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsAdmin]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]


class CompetitionRoleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CompetitionRole.objects.all()
    serializer_class = serializers.CompetitionRoleSerializer
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
def me(request):
    """Get or update current user profile"""
    
    if request.method == 'GET':
        try:
            result = services.get_profile(user=request.user)
            
            return success_response(
                data={
                    'token': result['token'],
                    'user': {
                        'id': result['user'].id,
                        'username': result['user'].username,
                        'email': result['user'].email,
                    },
                    'profile': serializers.UserProfileResponseSerializer(result['user_account']).data
                },
                message='Profile retrieved successfully'
            )
        
        except ValueError as e:
            return error_response(
                code='Profile_not_found',
                message=str(e),
                status_code=status.HTTP_404_NOT_FOUND
            )
        
        except Exception as e:
            logger.error(f'Unexpected error retrieving profile: {str(e)}')
            return error_response(
                code='Server_error',
                message='Failed to retrieve profile',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    elif request.method == 'PATCH':
        serializer = serializers.UpdateProfileSerializer(data=request.data)
        
        if not serializer.is_valid():
            return validation_error_response(serializer.errors)
        
        profile_picture = None
        if 'profile_picture' in request.data:
            if 'profile_picture' in request.FILES:
                uploaded_file = request.FILES['profile_picture']
                try:
                    validate_profile_picture(uploaded_file)
                    profile_picture = uploaded_file
                except serializers.ValidationError as e:
                    return error_response(
                        code='Invalid_file',
                        message=str(e),
                        status_code=status.HTTP_400_BAD_REQUEST
                    )
            elif request.data.get('profile_picture') == '':
                profile_picture = ''
        
        try:
            result = services.update_profile(
                user=request.user,
                profile_picture=profile_picture,
                **serializer.validated_data
            )
            
            return success_response(
                data={
                    'token': result['token'],
                    'user': {
                        'id': result['user'].id,
                        'username': result['user'].username,
                        'email': result['user'].email,
                    },
                    'profile': serializers.UserProfileResponseSerializer(result['user_account']).data
                },
                message='Profile updated successfully'
            )
        
        except Country.DoesNotExist:
            return error_response(
                code='Invalid_nationality',
                message='Invalid nationality code',
                status_code=status.HTTP_400_BAD_REQUEST
            )
        
        except Exception as e:
            logger.error(f'Unexpected error updating profile: {str(e)}')
            return error_response(
                code='Server_error',
                message='Failed to update profile',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """Login a user account"""
    
    serializer = serializers.LoginSerializer(data=request.data)

    if not serializer.is_valid():
        return validation_error_response(serializer.errors)

    try:
        result = services.login(**serializer.validated_data)

        return success_response(
            data={
                'token': result['token'],
                'user': {
                    'id': result['user'].id,
                    'username': result['user'].username,
                    'email': result['user'].email,
                    'full_name': result['user_account'].full_name,
                }
            },
            message='Login successful',
            status_code=status.HTTP_200_OK
            
        )
    except ValueError as e:
        return error_response(
            code='Invalid_credentials',
            message=str(e),
            status_code=status.HTTP_401_UNAUTHORIZED
        )
        
    except Exception as e:
        logger.error(f'Unexpected error during login: {str(e)}')
        return error_response(
            code="Login_failed",
            message="Login failed due to server error",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login(request):
    """Login or register user via Google OAuth"""
    
    serializer = serializers.GoogleLoginSerializer(data=request.data)
    
    if not serializer.is_valid():
        return validation_error_response(serializer.errors)
    
    try:
        result = services.google_login(
            google_token=serializer.validated_data['token']
        )
        
        return success_response(
            data={
                'token': result['token'],
                'user': {
                    'id': result['user'].id,
                    'username': result['user'].username,
                    'email': result['user'].email,
                    'full_name': result['user_account'].full_name,
                }
            },
            message='Google login successful',
            status_code=status.HTTP_200_OK
        )
    
    except ValueError as e:
        return error_response(
            code='Invalid_token',
            message=str(e),
            status_code=status.HTTP_401_UNAUTHORIZED
        )
    
    except Exception as e:
        logger.error(f'Unexpected error during Google login: {str(e)}')
        return error_response(
            code='Login_failed',
            message='Google login failed',
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """Register a new user account"""
    serializer = serializers.RegisterSerializer(data=request.data)
    
    if not serializer.is_valid():
        return validation_error_response(serializer.errors)

    try:
        result = services.register(**serializer.validated_data)
        
        return success_response(
            data={
                'token': result['token'],
                'user': {
                    'id': result['user'].id,
                    'username': result['user'].username,
                    'email': result['user'].email,
                    'full_name': result['user_account'].full_name,
                }
            },
            message="User registered successfully",
            status_code=status.HTTP_201_CREATED
        )        
    except IntegrityError:
        logger.error('IntegrityError during registration')
        return error_response(
            code="Duplicate_user",
            message="Username or email already exists",
            status_code=status.HTTP_409_CONFLICT
        )
    
    except Country.DoesNotExist:
        logger.error('Country not found during registration')
        return error_response(
            code="Invalid_nationality",
            message="Invalid nationality code",
            status_code=status.HTTP_400_BAD_REQUEST
        )
    
    except Exception as e:
        logger.error(f'Unexpected error during registration: {str(e)}')
        return error_response(
            code="Registration_failed",
            message="Registration failed due to server error",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@csrf_exempt
@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def logout(request):
    """Logout user by deleting their token"""
    print("====== LOGOUT CALLED ======")
    print(f"User: {request.user}")
    print(f"Is authenticated: {request.user.is_authenticated}")
    print(f"Auth header: {request.META.get('HTTP_AUTHORIZATION')}")

    try:
        services.logout(user=request.user)
        
        return success_response(
            data=None,
            message='Successfully logged out',
            status_code=status.HTTP_200_OK
        )
    
    except Exception as e:
        logger.error(f'Unexpected error during logout: {str(e)}')
        return error_response(
            code='Logout_failed',
            message='Logout failed',
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

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
