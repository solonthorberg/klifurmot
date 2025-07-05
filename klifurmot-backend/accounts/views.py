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
from datetime import timedelta
from google.oauth2 import id_token
from google.auth.transport import requests
from django.conf import settings

from competitions.models import Competition

from .models import Country, UserAccount, CompetitionRole, JudgeLink
from .serializers import (
    CountrySerializer, UserAccountSerializer, CompetitionRoleSerializer, UserSerializer
)

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
        data = request.data

        if profile:
            profile.full_name = data.get('full_name', profile.full_name)
            profile.gender = data.get('gender', profile.gender)
            dob = data.get('date_of_birth')
            if dob:
                profile.date_of_birth = parse_date(dob)
            profile.nationality_id = data.get('nationality', profile.nationality_id)
            profile.height_cm = data.get('height_cm', profile.height_cm)
            profile.wingspan_cm = data.get('wingspan_cm', profile.wingspan_cm)
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
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    password2 = data.get('password2')
    full_name = data.get('full_name', '').strip()

    if not username or not email or not password:
        return Response({"detail": "Username, email, and password are required."}, status=400)
    if password != password2:
        return Response({"detail": "Passwords do not match."}, status=400)
    if not full_name:
        return Response({"detail": "Full name is required."}, status=400)
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
    profile.height_cm = data.get('height_cm')
    profile.wingspan_cm = data.get('wingspan_cm')
    profile.save()

    token, _ = Token.objects.get_or_create(user=user)
    return Response(SerializeUserResponse(user, token), status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def Logout(request):
    request.user.auth_token.delete()
    return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)

class SendJudgeLinkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, competition_id):
        user_account = getattr(request.user, 'profile', None)
        if not user_account:
            return Response({"detail": "No user profile found."}, status=403)

        if not user_account.is_admin:
            return Response({"detail": "Only admins can send judge links."}, status=403)

        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"detail": "User ID required."}, status=400)

        expires_at = request.data.get("expires_at")
        if expires_at:
            try:
                expires_at = timezone.datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
            except ValueError:
                return Response({"detail": "Invalid expiration date format."}, status=400)
        else:
            expires_at = timezone.now() + timedelta(days=1)

        try:
            judge_user_account = UserAccount.objects.get(id=user_id)
            competition = Competition.objects.get(id=competition_id)
        except (UserAccount.DoesNotExist, Competition.DoesNotExist):
            return Response({"detail": "Invalid user or competition."}, status=404)

        # Create or update the judge link
        link, created = JudgeLink.objects.get_or_create(
            user=judge_user_account.user,
            competition=competition,
            defaults={
                "created_by": request.user,
                "expires_at": expires_at
            }
        )

        if not created and link.expires_at != expires_at:
            link.expires_at = expires_at
            link.save()

        # Automatically assign judge role to the user for this competition
        competition_role, role_created = CompetitionRole.objects.get_or_create(
            user=judge_user_account,
            competition=competition,
            defaults={
                "role": "judge",
                "created_by": request.user.profile,
                "last_modified_by": request.user.profile
            }
        )

        # If role already exists but isn't judge, update it to judge
        if not role_created and competition_role.role != "judge":
            competition_role.role = "judge"
            competition_role.last_modified_by = request.user.profile
            competition_role.save()

        frontend_url = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173")
        
        return Response({
            "judge_link": f"{frontend_url}/judge/login/{link.token}/",
            "expires_at": link.expires_at,
            "is_used": link.is_used,
            "created": created,
            "role_assigned": True,
            "role_created": role_created,
            "detail": f"Judge link created and judge role assigned to {judge_user_account.full_name}"
        })

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
            "user_id": link.user.id,
            "user_email": link.user.email,
            "token": str(link.token),
            "is_used": link.is_used,
        })
    except JudgeLink.DoesNotExist:
        return Response({"detail": "Invalid token."}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def GetCompetitionJudgeLinks(request, competition_id):
    """Get all judge links for a specific competition"""
    user_account = getattr(request.user, 'profile', None)
    if not user_account:
        return Response({"detail": "No user profile found."}, status=403)

    # Check if user is admin
    if not user_account.is_admin:
        return Response({"detail": "Only admins can view judge links."}, status=403)

    try:
        competition = Competition.objects.get(id=competition_id)
    except Competition.DoesNotExist:
        return Response({"detail": "Competition not found."}, status=404)

    # Get all judge links for this competition
    judge_links = JudgeLink.objects.filter(competition=competition).select_related('user')
    
    frontend_url = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173")
    
    links_data = []
    for link in judge_links:
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

@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def ManageJudgeLink(request, link_id):
    """Update or delete a judge link"""
    user_account = getattr(request.user, 'profile', None)
    if not user_account:
        return Response({"detail": "No user profile found."}, status=403)

    # Check if user is admin
    if not user_account.is_admin:
        return Response({"detail": "Only admins can manage judge links."}, status=403)

    try:
        judge_link = JudgeLink.objects.get(id=link_id)
    except JudgeLink.DoesNotExist:
        return Response({"detail": "Judge link not found."}, status=404)

    if request.method == 'PATCH':
        # Update expiration date if provided
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
            "user_id": judge_link.user.id,
            "user_email": judge_link.user.email,
            "judge_link": f"{frontend_url}/judge/login/{judge_link.token}/",
            "expires_at": judge_link.expires_at,
            "is_used": judge_link.is_used,
            "detail": "Judge link updated successfully."
        })

    elif request.method == 'DELETE':
        judge_link.delete()
        return Response({"detail": "Judge link deleted successfully."}, status=200)