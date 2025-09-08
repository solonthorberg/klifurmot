import logging
from django.db import IntegrityError
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
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
            "full_name": user.get_full_name(),
            "is_staff": user.is_staff,
        },
        "profile": {
            "full_name": profile.full_name if profile else None,
            "gender": profile.gender if profile else None,
            "date_of_birth": profile.date_of_birth if profile else None,
            "nationality": profile.nationality_id if profile else None,
            "is_admin": profile.is_admin if profile else False,
            "height_cm": profile.height_cm if profile else None,
            "wingspan_cm": profile.wingspan_cm if profile else None,
            "profile_picture": (profile.profile_picture.url if profile and profile.profile_picture else None),
        } if profile else None
    }

class CountryViewSet(viewsets.ModelViewSet):
    queryset = Country.objects.all()
    serializer_class = CountrySerializer
    permission_classes = [AllowAny]

class UserAccountViewSet(viewsets.ModelViewSet):
    queryset = UserAccount.objects.all()
    serializer_class = UserAccountSerializer
    permission_classes = [IsAuthenticated]

class UserViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

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
    profile = getattr(user, 'profile', None)

    if request.method == 'PATCH':
        print("=== PROFILE UPDATE DEBUG ===")
        print("Content type:", request.content_type)
        print("Files:", request.FILES)
        print("Data keys:", list(request.data.keys()) if hasattr(request.data, 'keys') else 'No keys')

        data = request.data

        if profile:
            profile.full_name = data.get('full_name', profile.full_name)
            profile.gender = data.get('gender', profile.gender)
            dob = data.get('date_of_birth')
            if dob:
                profile.date_of_birth = parse_date(dob)
            profile.nationality_id = data.get('nationality', profile.nationality_id)
            
            height_cm = data.get('height_cm')
            wingspan_cm = data.get('wingspan_cm')
            
            if height_cm is not None:
                profile.height_cm = int(height_cm) if height_cm and str(height_cm).strip() != '' else None
            
            if wingspan_cm is not None:
                profile.wingspan_cm = int(wingspan_cm) if wingspan_cm and str(wingspan_cm).strip() != '' else None

            if 'profile_picture' in request.data:
                if 'profile_picture' in request.FILES:
                    profile.profile_picture = request.FILES['profile_picture']
                elif request.data.get('profile_picture') == '':
                    profile.profile_picture.delete(save=False)
                    profile.profile_picture = None

        profile.save()

        user.email = data.get('email', user.email)
        user.save()

    token, _ = Token.objects.get_or_create(user=user)
    return Response(SerializeUserResponse(user, token))

@api_view(['POST'])
@permission_classes([AllowAny])
def Login(request):
    data = request.data
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return Response({"detail": "Missing credentials"}, status=400)

    try:
        user_obj = User.objects.get(email=email)
        user = authenticate(username=user_obj.username, password=password)
    except User.DoesNotExist:
        return Response({"detail": "Invalid credentials"}, status=401)

    if user is not None:
        token, _ = Token.objects.get_or_create(user=user)
        return Response(SerializeUserResponse(user, token))
    return Response({"detail": "Invalid credentials"}, status=401)

@api_view(["POST"])
@permission_classes([AllowAny])
def GoogleLogin(request):
    token_from_client = request.data.get("token")
    if not token_from_client:
        return Response({"detail": "Missing token"}, status=400)

    try:
        idinfo = id_token.verify_oauth2_token(
            token_from_client, requests.Request(), settings.GOOGLE_CLIENT_ID
        )

        email = idinfo["email"]
        full_name = idinfo.get("name", "")
        first_name, *last_parts = full_name.strip().split(" ", 1)
        last_name = last_parts[0] if last_parts else ""

        user, _ = User.objects.get_or_create(email=email, defaults={
            "username": email.split("@")[0],
            "first_name": first_name,
            "last_name": last_name,
        })
        token, _ = Token.objects.get_or_create(user=user)
        return Response(SerializeUserResponse(user, token))
    except ValueError:
        return Response({"detail": "Invalid Google token"}, status=401)

@api_view(['POST'])
@permission_classes([AllowAny])
def Register(request):
    data = request.data
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")
    password2 = data.get("password2")
    full_name = data.get("full_name")

    if not all([email, password, password2, full_name]):
        return Response({"detail": "Missing required fields"}, status=400)
    
    if password != password2:
        return Response({"detail": "Passwords do not match"}, status=400)
    
    try:
        validate_email(email)
    except ValidationError:
        return Response({"detail": "Invalid email address."}, status=400)
        
    if len(password) < 8:
        return Response({"detail": "Password must be at least 8 characters long."}, status=400)
        
    if User.objects.filter(username=username).exists():
        return Response({"detail": "Username already exists."}, status=400)
        
    if User.objects.filter(email=email).exists():
        return Response({"detail": "Email already exists."}, status=400)

    user = User.objects.create_user(username=username, email=email, password=password)
    profile, _ = UserAccount.objects.get_or_create(user=user)
    profile.full_name = full_name
    profile.gender = data.get('gender')
    profile.date_of_birth = parse_date(data.get('date_of_birth')) if data.get('date_of_birth') else None
    profile.nationality_id = data.get('nationality')
    
    height_cm = data.get('height_cm')
    wingspan_cm = data.get('wingspan_cm')
    
    profile.height_cm = int(height_cm) if height_cm and str(height_cm).strip() != '' else None
    profile.wingspan_cm = int(wingspan_cm) if wingspan_cm and str(wingspan_cm).strip() != '' else None
    
    profile.save()

    token, _ = Token.objects.get_or_create(user=user)
    return Response(SerializeUserResponse(user, token), status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def Logout(request):
    request.user.auth_token.delete()
    return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)

class SendJudgeInvitationView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, competition_id):
        user_account = getattr(request.user, 'profile', None)
        if not user_account:
            return Response({"detail": "No user profile found."}, status=403)

        if not user_account.is_admin:
            return Response({"detail": "Only admins can send judge invitations."}, status=403)
        
        email = request.data.get("email")
        name = request.data.get("name", "")
        expires_at = request.data.get("expires_at")
        
        if not email:
            return Response({"detail": "Email is required."}, status=400)
            
        if not expires_at:
            return Response({"detail": "expires_at is required."}, status=400)
        
        try:
            validate_email(email)
        except ValidationError:
            return Response({"detail": "Invalid email address."}, status=400)
        
        try:
            competition = Competition.objects.get(id=competition_id)
        except Competition.DoesNotExist:
            return Response({"detail": "Competition not found."}, status=404)
        
        # Parse expiration date
        try:
            expiration_dt = timezone.datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
        except ValueError:
            return Response({"detail": "Invalid expiration date format."}, status=400)
        
        existing_user = User.objects.filter(email=email).first()
        
        if existing_user:
            # Create judge link for existing user
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
            
            # Ensure user account exists
            UserAccount.objects.get_or_create(user=existing_user)
            
            # Create judge role
            CompetitionRole.objects.get_or_create(
                user=existing_user.profile,
                competition=competition,
                defaults={"role": "judge"}
            )
            
            judge_url = f"{settings.FRONTEND_BASE_URL}/judge/login/{link.token}/"
            link_type = "existing_user"
        else:
            # Create invitation for new user
            existing_link = JudgeLink.objects.filter(
                invited_email=email,
                competition_id=competition_id,
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
            "role_assigned": link_type == "existing_user",
            "detail": f"{'Invitation' if link_type == 'invitation' else 'Link'} {'created' if created else 'updated'} for {email}"
        })

@api_view(['GET'])
@permission_classes([AllowAny])
def ValidateInvitation(request, token):
    try:
        link = JudgeLink.objects.get(token=token)
        
        if link.expires_at < timezone.now():
            return Response({"detail": "Invitation has expired."}, status=400)
        
        if link.claimed_at:
            return Response({
                "detail": "Invitation has already been claimed.",
                "claimed": True
            }, status=400)
        
        return Response({
            "valid": True,
            "competition_id": link.competition.id,
            "competition_title": link.competition.title,
            "invited_email": link.invited_email,
            "invited_name": link.invited_name,
            "expires_at": link.expires_at,
            "token": str(link.token)
        })
    except JudgeLink.DoesNotExist:
        return Response({"detail": "Invalid invitation token."}, status=404)

@api_view(['POST'])
@permission_classes([AllowAny])
def ClaimJudgeInvitation(request, token):
    try:
        link = JudgeLink.objects.get(token=token)
        
        if link.expires_at < timezone.now():
            return Response({"detail": "Invitation expired"}, status=400)
        
        if link.claimed_at:
            return Response({"detail": "Invitation already claimed"}, status=400)
        
        if not request.user.is_authenticated:
            return Response({
                "authenticated": False,
                "requires_auth": True,
                "invitation_valid": True,
                "competition_title": link.competition.title,
                "invited_email": link.invited_email,
                "invited_name": link.invited_name
            }, status=401)
        
        if link.invited_email and request.user.email != link.invited_email:
            return Response({
                "detail": f"Þetta boð er fyrir {link.invited_email}. Vinsamlegast notið rétt netfang."
            }, status=403)
        
        link.claimed_by = request.user
        link.claimed_at = timezone.now()
        link.user = request.user
        link.is_used = True
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
            "competition_id": link.competition.id,
            "redirect_to": f"/judge/competition/{link.competition.id}/judge-dashboard"
        })
        
    except JudgeLink.DoesNotExist:
        return Response({"detail": "Invalid invitation"}, status=404)

@api_view(['GET'])
@permission_classes([AllowAny])
def ValidateJudgeToken(request, token):
    try:
        link = JudgeLink.objects.get(token=token)
        if link.expires_at < timezone.now():
            return Response({"detail": "Link expired."}, status=400)
        return Response({
            "competition_id": link.competition.id,
            "competition_title": link.competition.title,
            "user_id": link.user.id if link.user else None,
            "user_email": link.user.email if link.user else None,
            "token": str(link.token),
            "is_used": link.is_used,
        })
    except JudgeLink.DoesNotExist:
        return Response({"detail": "Invalid token."}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def GetCompetitionJudgeLinks(request, competition_id):
    user_account = getattr(request.user, 'profile', None)
    if not user_account:
        return Response({"detail": "No user profile found."}, status=403)

    if not user_account.is_admin:
        return Response({"detail": "Only admins can view judge links."}, status=403)

    try:
        competition = Competition.objects.get(id=competition_id)
    except Competition.DoesNotExist:
        return Response({"detail": "Competition not found."}, status=404)

    judge_links = JudgeLink.objects.filter(competition=competition).select_related('user')
    
    frontend_url = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173")
    
    links_data = []
    for link in judge_links:
        if link.user:
            links_data.append({
                "id": link.id,
                "user_id": link.user.id,
                "user_email": link.user.email,
                "judge_link": f"{frontend_url}/judge/login/{link.token}/",
                "token": str(link.token),
                "expires_at": link.expires_at,
                "is_used": link.is_used,
                "created_at": link.created_at,
            })
    
    return Response(links_data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def GetCompetitionInvitations(request, competition_id):
    user_account = getattr(request.user, 'profile', None)
    if not user_account or not user_account.is_admin:
        return Response({"detail": "Only admins can view invitations."}, status=403)
    
    try:
        competition = Competition.objects.get(id=competition_id)
    except Competition.DoesNotExist:
        return Response({"detail": "Competition not found."}, status=404)
    
    invitation_links = JudgeLink.objects.filter(
        competition=competition,
        invited_email__isnull=False  # Only invitations
    )
    
    links_data = []
    for link in invitation_links:
        links_data.append({
            "id": link.id,
            "type": "invitation",
            "invited_email": link.invited_email,
            "invited_name": link.invited_name,
            "judge_link": f"{settings.FRONTEND_BASE_URL}/judge/invite/{link.token}/",
            "expires_at": link.expires_at,
            "claimed_at": link.claimed_at,
            "claimed_by": link.claimed_by.email if link.claimed_by else None,
            "created_at": link.created_at,
        })
    
    return Response(links_data)

@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def ManageJudgeLink(request, link_id):
    user_account = getattr(request.user, 'profile', None)
    if not user_account:
        return Response({"detail": "No user profile found."}, status=403)

    if not user_account.is_admin:
        return Response({"detail": "Only admins can manage judge links."}, status=403)

    try:
        judge_link = JudgeLink.objects.get(id=link_id)
    except JudgeLink.DoesNotExist:
        return Response({"detail": "Judge link not found."}, status=404)

    if request.method == 'PATCH':
        expires_at = request.data.get("expires_at")
        if expires_at:
            try:
                judge_link.expires_at = timezone.datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                judge_link.save()
            except ValueError:
                return Response({"detail": "Invalid expiration date format."}, status=400)

        frontend_url = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173")
        
        return Response({
            "id": judge_link.id,
            "user_id": judge_link.user.id if judge_link.user else None,
            "user_email": judge_link.user.email if judge_link.user else None,
            "judge_link": f"{frontend_url}/judge/login/{judge_link.token}/",
            "expires_at": judge_link.expires_at,
            "is_used": judge_link.is_used,
            "detail": "Judge link updated successfully."
        })

    elif request.method == 'DELETE':
        judge_link.delete()
        return Response({"detail": "Judge link deleted successfully."}, status=200)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def CreateJudgeLink(request, competition_id):
    """Create a judge link for an existing user"""
    user_account = getattr(request.user, 'profile', None)
    if not user_account:
        return Response({"detail": "No user profile found."}, status=403)
    
    if not user_account.is_admin:
        return Response({"detail": "Only admins can create judge links."}, status=403)
    
    try:
        competition = Competition.objects.get(id=competition_id)
    except Competition.DoesNotExist:
        return Response({"detail": "Competition not found."}, status=404)
    
    user_id = request.data.get("user_id")
    expires_at = request.data.get("expires_at")
    
    if not user_id:
        return Response({"detail": "user_id is required."}, status=400)
    
    if not expires_at:
        return Response({"detail": "expires_at is required."}, status=400)
    
    try:
        target_user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return Response({"detail": "User not found."}, status=404)
    
    try:
        expiration_dt = parse_expiration_date(expires_at)
    except ValueError:
        return Response({"detail": "Invalid expiration date format."}, status=400)
    
    if expiration_dt <= timezone.now():
        return Response({"detail": "Expiration date must be in the future."}, status=400)
    
    max_expiration = timezone.now() + timezone.timedelta(days=365)
    if expiration_dt > max_expiration:
        return Response({"detail": "Expiration date cannot be more than 1 year from now."}, status=400)
    
    try:
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
            
    except IntegrityError:
        return Response({
            "detail": "A judge link already exists for this user and competition"
        }, status=400)
    
    target_user_account, _ = UserAccount.objects.get_or_create(user=target_user)
    
    role, role_created = CompetitionRole.objects.get_or_create(
        user=target_user_account,
        competition=competition,
        defaults={"role": "judge"}
    )
    
    frontend_url = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173")
    judge_url = f"{frontend_url}/judge/login/{link.token}/"
    
    action = "created" if created else "updated"
    logger.info(
        f"Judge link {action} for user {target_user.email} "
        f"in competition '{competition.title}' by admin {request.user.email}"
    )
    
    return Response({
        "judge_link": judge_url,
        "user_id": target_user.id,
        "user_email": target_user.email,
        "expires_at": link.expires_at,
        "created": created,
        "role_assigned": True,
        "role_created": role_created,
        "detail": f"Judge link {action} for {target_user.email}"
    }, status=201 if created else 200)