import logging
from django.db import IntegrityError
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.views.decorators.csrf import csrf_exempt
from typing import Dict, Any, Optional, cast

from . import permissions
from core import utils
from . import services
from . import serializers
from . import models


logger = logging.getLogger(__name__)

# Create your views here.


class CountryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for countries - read-only list"""

    queryset = models.Country.objects.all()
    serializer_class = serializers.CountrySerializer
    permission_classes = [AllowAny]

    def list(self):
        """List all countries"""
        try:
            result = services.get_countries()
            serializer = self.get_serializer(result["countries"], many=True)

            return utils.success_response(
                data=serializer.data,
                message="Countries retrieved successfully",
            )

        except Exception as e:
            logger.error(f"Error retrieving countries: {str(e)}")
            return utils.error_response(
                code="Server_error",
                message="Failed to retrieve countries",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class CompetitionRoleViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for competition roles (judge, admin assignments)"""

    serializer_class = serializers.CompetitionRoleSerializer
    permission_classes = [IsAuthenticated]

    def list(self, request):
        """List all roles based on permissions"""
        try:
            competition_id = request.query_params.get("competition_id")
            role = request.query_params.get("role")

            result = services.get_competition_roles(
                user=request.user, competition_id=competition_id, role=role
            )

            serializer = self.get_serializer(result["roles"], many=True)

            return utils.success_response(
                data=serializer.data, message="Roles retrieved successfully"
            )

        except PermissionError as e:
            return utils.error_response(
                code="Access_denied",
                message=str(e),
                status_code=status.HTTP_403_FORBIDDEN,
            )

        except Exception as e:
            logger.error(f"Error retrieving roles: {str(e)}")
            return utils.error_response(
                code="Server_error",
                message="Failed to retrieve roles",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def retrieve(self, request, **kwargs):
        """Retrieve single role"""
        try:
            role_id = kwargs.get("pk")
            if role_id is None:
                raise ValueError("Role ID is required")

            role_id_int = int(role_id)

            result = services.get_competition_role_by_id(
                user=request.user, role_id=role_id_int
            )

            serializer = self.get_serializer(result["role"])

            return utils.success_response(
                data=serializer.data, message="Role retrieved successfully"
            )

        except models.CompetitionRole.DoesNotExist:
            return utils.error_response(
                code="Not_found",
                message="Role not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        except PermissionError as e:
            return utils.error_response(
                code="Access_denied",
                message=str(e),
                status_code=status.HTTP_403_FORBIDDEN,
            )

        except Exception as e:
            logger.error(f"Error retrieving role: {str(e)}")
            return utils.error_response(
                code="Server_error",
                message="Failed to retrieve role",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated, permissions.IsActiveAccount])
def me(request):
    """Get or update current user profile"""

    if request.method == "GET":
        try:
            result = services.get_profile(user=request.user)

            return utils.success_response(
                data={
                    "user": {
                        "id": result["user"].id,
                        "username": result["user"].username,
                        "email": result["user"].email,
                    },
                    "profile": serializers.UserProfileResponseSerializer(
                        result["user_account"]
                    ).data,
                },
                message="Profile retrieved successfully",
            )

        except ValueError as e:
            return utils.error_response(
                code="Profile_not_found",
                message=str(e),
                status_code=status.HTTP_404_NOT_FOUND,
            )

        except Exception as e:
            logger.error(f"Unexpected error retrieving profile: {str(e)}")
            return utils.error_response(
                code="Server_error",
                message="Failed to retrieve profile",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    elif request.method == "PATCH":
        serializer = serializers.UpdateProfileSerializer(data=request.data)

        if not serializer.is_valid():
            errors_dict = cast(Dict[str, Any], serializer.errors)
            return utils.validation_error_response(serializer_errors=errors_dict)

        profile_picture = None
        if "profile_picture" in request.data:
            if "profile_picture" in request.FILES:
                uploaded_file = request.FILES["profile_picture"]
                try:
                    serializer.validate_profile_picture(uploaded_file)
                    profile_picture = uploaded_file
                except serializers.ValidationError as e:
                    return utils.error_response(
                        code="Invalid_file",
                        message=str(e),
                        status_code=status.HTTP_400_BAD_REQUEST,
                    )
            elif request.data.get("profile_picture") == "":
                profile_picture = ""

        try:
            if (
                not hasattr(serializer, "validated_data")
                or serializer.validated_data is None
            ):
                validated_data = {}
            else:
                validated_data = {
                    str(k): v for k, v in serializer.validated_data.items()
                }

            result = services.update_profile(
                user=request.user,
                profile_picture=profile_picture,
                **validated_data,
            )

            return utils.success_response(
                data={
                    "user": {
                        "id": result["user"].id,
                        "username": result["user"].username,
                        "email": result["user"].email,
                    },
                    "profile": serializers.UserProfileResponseSerializer(
                        result["user_account"]
                    ).data,
                },
                message="Profile updated successfully",
            )

        except models.Country.DoesNotExist:
            return utils.error_response(
                code="Invalid_nationality",
                message="Invalid nationality code",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as e:
            logger.error(f"Unexpected error updating profile: {str(e)}")
            return utils.error_response(
                code="Server_error",
                message="Failed to update profile",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["POST"])
@permission_classes([AllowAny])
def login(request):
    """Login a user account"""

    serializer = serializers.LoginSerializer(data=request.data)

    if not serializer.is_valid():
        errors_dict = cast(Dict[str, Any], serializer.errors)
        return utils.validation_error_response(serializer_errors=errors_dict)

    try:
        if (
            not hasattr(serializer, "validated_data")
            or serializer.validated_data is None
        ):
            validated_data: Dict[str, Any] = {}
        else:
            validated_data = cast(Dict[str, Any], serializer.validated_data)

        email = ""
        password = ""

        if "email" in validated_data:
            email_value = validated_data["email"]
            email = str(email_value) if email_value is not None else ""

        if "password" in validated_data:
            password_value = validated_data["password"]
            password = str(password_value) if password_value is not None else ""

        if not email or not password:
            return utils.error_response(
                code="Missing_credentials",
                message="Email and password are required",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        result = services.login(
            email=email,
            password=password,
        )

        return utils.success_response(
            data={
                "access": result["access"],
                "refresh": result["refresh"],
                "user": {
                    "id": result["user"].id,
                    "username": result["user"].username,
                    "email": result["user"].email,
                    "full_name": result["user_account"].full_name,
                },
            },
            message="Login successful",
            status_code=status.HTTP_200_OK,
        )

    except ValueError as e:
        return utils.error_response(
            code="Invalid_credentials",
            message=str(e),
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    except Exception as e:
        logger.error(f"Unexpected error during login: {str(e)}")
        return utils.error_response(
            code="Login_failed",
            message="Login failed due to server error",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def google_login(request):
    """Login or register user via Google OAuth"""

    serializer = serializers.GoogleLoginSerializer(data=request.data)

    if not serializer.is_valid():
        errors_dict = cast(Dict[str, Any], serializer.errors)
        return utils.validation_error_response(serializer_errors=errors_dict)

    try:
        token: Optional[str] = None

        if (
            hasattr(serializer, "validated_data")
            and serializer.validated_data is not None
        ):
            data = serializer.validated_data
            if isinstance(data, dict) and "token" in data:
                token_value = data.get("token")
                if token_value is not None:
                    token = str(token_value)

        if not token:
            return utils.error_response(
                code="Missing_token",
                message="Google token is required",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        result = services.google_login(google_token=token)

        return utils.success_response(
            data={
                "access": result["access"],
                "refresh": result["refresh"],
                "user": {
                    "id": result["user"].id,
                    "username": result["user"].username,
                    "email": result["user"].email,
                    "full_name": result["user_account"].full_name,
                },
            },
            message="Google login successful",
            status_code=status.HTTP_200_OK,
        )

    except ValueError as e:
        return utils.error_response(
            code="Invalid_token",
            message=str(e),
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    except Exception as e:
        logger.error(f"Unexpected error during Google login: {str(e)}")
        return utils.error_response(
            code="Login_failed",
            message="Google login failed",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    """Register a new user account"""
    serializer = serializers.RegisterSerializer(data=request.data)

    if not serializer.is_valid():
        errors_dict = cast(Dict[str, Any], serializer.errors)
        return utils.validation_error_response(serializer_errors=errors_dict)

    try:
        validated_data: Dict[str, Any] = {}
        if (
            hasattr(serializer, "validated_data")
            and serializer.validated_data is not None
        ):
            validated_data = cast(Dict[str, Any], serializer.validated_data)

        required_fields = [
            "username",
            "email",
            "password",
            "full_name",
            "gender",
            "date_of_birth",
            "nationality",
        ]

        missing_fields = []
        for field in required_fields:
            if field not in validated_data or validated_data[field] is None:
                missing_fields.append(field)

        if missing_fields:
            return utils.error_response(
                code="Missing_fields",
                message=f"The following required fields are missing: {', '.join(missing_fields)}",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        username = str(validated_data["username"])
        email = str(validated_data["email"])
        password = str(validated_data["password"])
        full_name = str(validated_data["full_name"])
        gender = str(validated_data["gender"])
        date_of_birth = validated_data["date_of_birth"]
        nationality = str(validated_data["nationality"])

        result = services.register(
            username=username,
            email=email,
            password=password,
            full_name=full_name,
            gender=gender,
            date_of_birth=date_of_birth,
            nationality=nationality,
        )

        return utils.success_response(
            data={
                "access": result["access"],
                "refresh": result["refresh"],
                "user": {
                    "id": result["user"].id,
                    "username": result["user"].username,
                    "email": result["user"].email,
                    "full_name": result["user_account"].full_name,
                },
            },
            message="User registered successfully",
            status_code=status.HTTP_201_CREATED,
        )
    except IntegrityError:
        logger.error("IntegrityError during registration")
        return utils.error_response(
            code="Duplicate_user",
            message="Username or email already exists",
            status_code=status.HTTP_409_CONFLICT,
        )

    except models.Country.DoesNotExist:
        logger.error("Country not found during registration")
        return utils.error_response(
            code="Invalid_nationality",
            message="Invalid nationality code",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as e:
        logger.error(f"Unexpected error during registration: {str(e)}")
        return utils.error_response(
            code="Registration_failed",
            message="Registration failed due to server error",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    """Logout user by blacklisting their refresh token"""

    refresh_token = request.data.get("refresh")

    if not refresh_token:
        return utils.error_response(
            code="Missing_token",
            message="Refresh token is required",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        result = services.logout(refresh_token=refresh_token)

        return utils.success_response(
            data=None,
            message=result["message"],
            status_code=status.HTTP_200_OK,
        )

    except ValueError as e:
        return utils.error_response(
            code="Invalid_token",
            message=str(e),
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as e:
        logger.error(f"Unexpected error during logout: {str(e)}")
        return utils.error_response(
            code="Logout_failed",
            message="Logout failed",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def request_password_reset(request):
    """Request password reset email"""

    email = request.data.get("email", "").strip()

    if not email:
        return utils.error_response(
            code="Missing_email",
            message="Email is required",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    if "@" not in email:
        return utils.error_response(
            code="Invalid_email",
            message="Invalid email format",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        client_ip = request.META.get("REMOTE_ADDR")

        result = services.request_password_reset(email=email, request_ip=client_ip)

        return utils.success_response(
            data=None, message=result["message"], status_code=status.HTTP_200_OK
        )

    except Exception as e:
        logger.error(f"Error in password reset request view: {str(e)}")
        return utils.success_response(
            data=None,
            message="If an account exists with this email, you will receive reset instructions",
            status_code=status.HTTP_200_OK,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password(request):
    """Reset password with token"""

    token = request.data.get("token", "").strip()
    password = request.data.get("password", "")
    password_confirm = request.data.get("password_confirm", "")

    if not token:
        return utils.error_response(
            code="Missing_token",
            message="Reset token is required",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    if not password:
        return utils.error_response(
            code="Missing_password",
            message="New password is required",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    if password != password_confirm:
        return utils.error_response(
            code="Password_mismatch",
            message="Passwords do not match",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        client_ip = request.META.get("REMOTE_ADDR")

        result = services.reset_password(
            token=token, new_password=password, request_ip=client_ip
        )

        return utils.success_response(
            data=None, message=result["message"], status_code=status.HTTP_200_OK
        )

    except ValueError as e:
        return utils.error_response(
            code="Reset_failed", message=str(e), status_code=status.HTTP_400_BAD_REQUEST
        )

    except Exception as e:
        logger.error(f"Unexpected error in password reset: {str(e)}")
        return utils.error_response(
            code="Reset_failed",
            message="Password reset failed",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
