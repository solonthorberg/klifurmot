from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import User
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from .serializers import UserSerializer
from rest_framework.views import APIView
from competitions.models import Competition
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import timedelta
from google.oauth2 import id_token
from google.auth.transport import requests
from django.conf import settings


from .models import Country, UserAccount, CompetitionRole, JudgeLink
from .serializers import CountrySerializer, UserAccountSerializer, CompetitionRoleSerializer, JudgeLinkSerializer

# Create your views here.

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
        elif hasattr(self.request.user, 'profile'):
            return CompetitionRole.objects.filter(user=self.request.user.profile)
        return CompetitionRole.objects.none()


class CustomAuthToken(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data,
                                           context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)

        
        try:
            profile = user.profile
        except UserAccount.DoesNotExist:
            profile = None

        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.get_full_name(),
                'is_staff': user.is_staff,
            },
            'profile': {
                'gender': profile.gender if profile else None,
                'nationality': profile.nationality_id if profile else None,
                'is_admin': profile.is_admin if profile else False,
                'height_cm': profile.height_cm if profile else None,
                'wingspan_cm': profile.wingspan_cm if profile else None,
            } if profile else None
        }, status=status.HTTP_200_OK)
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    profile = getattr(user, 'profile', None)

    roles = []
    if profile:
        roles = [
            {
                "competition_id": r.competition.id,
                "title": r.competition.title,
                "role": r.role
            }
            for r in CompetitionRole.objects.filter(user=profile)
        ]

    return Response({
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.get_full_name(),
            "is_staff": user.is_staff,
        },
        "profile": {
            "gender": profile.gender if profile else None,
            "nationality": profile.nationality_id if profile else None,
            "is_admin": profile.is_admin if profile else False,
            "height_cm": profile.height_cm if profile else None,
            "wingspan_cm": profile.wingspan_cm if profile else None,
        } if profile else None,
        "roles": roles
    })

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    data = request.data
    identifier = data.get("username")
    password = data.get("password")

    if not identifier or not password:
        return Response({"detail": "Missing credentials"}, status=400)

    user = authenticate(username=identifier, password=password)

    if user is None:
        try:
            UserModel = get_user_model()
            user_obj = UserModel.objects.get(email=identifier)
            user = authenticate(username=user_obj.username, password=password)
        except UserModel.DoesNotExist:
            user = None

    if user is not None:
        token, _ = Token.objects.get_or_create(user=user)
        profile = getattr(user, 'profile', None)

        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'email': user.email,
                'username': user.username,
                'full_name': user.get_full_name(),
                'is_staff': user.is_staff
            },
            'profile': {
                'gender': profile.gender if profile else None,
                'nationality': profile.nationality_id if profile else None,
                'is_admin': profile.is_admin if profile else False,
                'height_cm': profile.height_cm if profile else None,
                'wingspan_cm': profile.wingspan_cm if profile else None,
            } if profile else None
        })
    else:
        return Response({"detail": "Invalid credentials"}, status=401)

@api_view(["POST"])
@permission_classes([AllowAny])
def google_login(request):
    token_from_client = request.data.get("token")

    if not token_from_client:
        return Response({"detail": "Missing token"}, status=400)

    try:
        idinfo = id_token.verify_oauth2_token(
            token_from_client,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )

        email = idinfo["email"]
        full_name = idinfo.get("name", "")
        first_name, *last_parts = full_name.strip().split(" ", 1)
        last_name = last_parts[0] if last_parts else ""

        User = get_user_model()
        user, created = User.objects.get_or_create(email=email, defaults={
            "username": email.split("@")[0],
            "first_name": first_name,
            "last_name": last_name,
        })

        token, _ = Token.objects.get_or_create(user=user)

        return Response({
            "token": token.key,
            "user": {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "full_name": user.get_full_name(),
                "is_staff": user.is_staff
            }
        })

    except ValueError:
        return Response({"detail": "Invalid Google token"}, status=401)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    data = request.data
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    password2 = data.get('password2')
    permission_classes = [AllowAny]

    if not username or not email or not password:
        return Response({"detail": "Username, email, and password are required."}, status=400)

    if password != password2:
        return Response({"detail": "Passwords do not match."}, status=400)

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

    full_name = data.get('full_name', '')

    if not username or not email or not password:
        return Response({"detail": "Username, email, and password are required."}, status=400)

    if not full_name.strip():
        return Response({"detail": "Full name is required."}, status=400)
    
    first_name, *last_parts = full_name.strip().split(' ', 1)
    last_name = last_parts[0] if last_parts else ''

    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        first_name=first_name,
        last_name=last_name
)

    profile = user.profile
    profile.gender = data.get('gender')
    profile.date_of_birth = data.get('date_of_birth')
    profile.nationality_id = data.get('nationality')
    profile.height_cm = data.get('height_cm')
    profile.wingspan_cm = data.get('wingspan_cm')
    profile.save()

    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        "token": token.key,
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.get_full_name(),
            "is_staff": user.is_staff
        },
        "profile": {
            "gender": profile.gender,
            "nationality": profile.nationality_id,
            "is_admin": profile.is_admin,
            "height_cm": profile.height_cm,
            "wingspan_cm": profile.wingspan_cm
        }
    }, status=status.HTTP_201_CREATED)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    request.user.auth_token.delete()
    return Response({"detail": "Successfully logged out."}, status=status.HTTP_200_OK)

class SendJudgeLinkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, competition_id):
        user_account = getattr(request.user, 'profile', None)
        if not user_account:
            return Response({"detail": "No user profile found."}, status=403)

        if not CompetitionRole.objects.filter(
            user=user_account,
            competition_id=competition_id,
            role='admin'
        ).exists():
            return Response({"detail": "Only competition admins can send judge links."}, status=403)

        user_id = request.data.get("user_id")
        if not user_id:
            return Response({"detail": "User ID required."}, status=400)

        try:
            judge_user = UserAccount.objects.get(id=user_id)
            competition = Competition.objects.get(id=competition_id)
        except (UserAccount.DoesNotExist, Competition.DoesNotExist):
            return Response({"detail": "Invalid user or competition."}, status=404)

        link, _ = JudgeLink.objects.get_or_create(
            user=judge_user.user,
            competition=competition,
            defaults={
                "created_by": request.user,
                "expires_at": timezone.now() + timedelta(days=1)
            }
        )

        return Response({
            "judge_link": f"http://localhost:3000/judge/login/{link.token}/",
            "expires_at": link.expires_at,
            "is_used": link.is_used
        })

