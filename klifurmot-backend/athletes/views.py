from typing import Dict, cast, Any
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.decorators import api_view, permission_classes

from accounts import permissions
from . import services
from . import serializers
from core import utils


@api_view(["GET"])
@permission_classes([AllowAny])
def public_athletes(request):
    search = request.query_params.get("search")

    result = services.list_public_athletes(search=search)

    return utils.success_response(
        data=result,
        message="Athletes retrieved successfully",
    )


@api_view(["GET"])
@permission_classes([AllowAny])
def public_athlete_detail(_, athlete_id):
    try:
        result = services.get_athlete_detail(athlete_id=athlete_id)

        return utils.success_response(
            data=result,
            message="Athlete retrieved successfully",
        )

    except ValueError as e:
        return utils.error_response(
            code="Not_found",
            message=str(e),
            status_code=status.HTTP_404_NOT_FOUND,
        )


@api_view(["GET", "POST"])
@permission_classes([permissions.IsAdmin])
def athletes(request):
    if request.method == "GET":
        search = request.query_params.get("search")
        result = services.list_all_climbers(search=search)
        return utils.success_response(
            data=result,
            message="Climbers retrieved successfully",
        )

    if request.method == "POST":
        from_account = request.data.get("from_account", False)

        if from_account:
            try:
                result = services.create_climber_for_user(
                    admin_user=request.user,
                    user_account_id=request.data["user_account_id"],
                )
                return utils.success_response(
                    data=result,
                    message="Climber created successfully",
                    status_code=status.HTTP_201_CREATED,
                )
            except ValueError as e:
                return utils.error_response(
                    code="Invalid_climber",
                    message=str(e),
                    status_code=status.HTTP_400_BAD_REQUEST,
                )
            except Exception as e:
                return utils.error_response(
                    code="Creation_failed",
                    message=str(e),
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        serializer = serializers.CreateClimberSerializer(data=request.data)
        if not serializer.is_valid():
            errors_dict = cast(Dict[str, Any], serializer.errors)
            return utils.validation_error_response(serializer_errors=errors_dict)

        try:
            validated_data = cast(Dict[str, Any], serializer.validated_data)
            result = services.create_climber(
                user=request.user,
                **validated_data,
            )
            return utils.success_response(
                data=result,
                message="Climber created successfully",
                status_code=status.HTTP_201_CREATED,
            )
        except ValueError as e:
            return utils.error_response(
                code="Invalid_climber",
                message=str(e),
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            return utils.error_response(
                code="Creation_failed",
                message=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([permissions.IsAdmin])
def athlete_detail(request, climber_id):
    if request.method == "GET":
        try:
            result = services.get_climber(climber_id=climber_id)

            return utils.success_response(
                data=result,
                message="Climber retrieved successfully",
            )

        except ValueError as e:
            return utils.error_response(
                code="Not_found",
                message=str(e),
                status_code=status.HTTP_404_NOT_FOUND,
            )

    if request.method == "PATCH":
        serializer = serializers.UpdateClimberSerializer(data=request.data)

        if not serializer.is_valid():
            errors_dict = cast(Dict[str, Any], serializer.errors)
            return utils.validation_error_response(serializer_errors=errors_dict)

        try:
            validated_data = cast(Dict[str, Any], serializer.validated_data)

            result = services.update_climber(
                climber_id=climber_id,
                user=request.user,
                **validated_data,
            )

            return utils.success_response(
                data=result,
                message="Climber updated successfully",
            )

        except ValueError as e:
            return utils.error_response(
                code="Update_failed",
                message=str(e),
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as e:
            return utils.error_response(
                code="Update_failed",
                message=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    if request.method == "DELETE":
        try:
            services.delete_climber(climber_id=climber_id)

            return utils.success_response(
                message="Climber deleted successfully",
            )

        except ValueError as e:
            return utils.error_response(
                code="Not_found",
                message=str(e),
                status_code=status.HTTP_404_NOT_FOUND,
            )

        except Exception as e:
            return utils.error_response(
                code="Delete_failed",
                message=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["POST"])
def link_simple_athlete(request, climber_id: int):
    user_account_id = request.data.get("user_account_id")
    if not user_account_id:
        return utils.error_response(
            code="Validation_error",
            message="user_account_id is required",
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    try:
        climber = services.link_climber(
            request.user, climber_id=climber_id, user_account_id=user_account_id
        )
        return utils.success_response(data=climber, status_code=status.HTTP_201_CREATED)
    except ValueError as e:
        return utils.error_response(
            code="Link_failed",
            message=str(e),
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    except Exception as e:
        return utils.error_response(
            code="Link_failed",
            message=str(e),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def registrations(request):
    if request.method == "GET":
        competition_id = request.query_params.get("competition_id")

        if competition_id and not competition_id.isdigit():
            return utils.error_response(
                code="Invalid_parameter",
                message="competition_id must be a number",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        result = services.list_registrations(
            competition_id=int(competition_id) if competition_id else None
        )

        return utils.success_response(
            data=result,
            message="Registrations retrieved successfully",
        )

    if request.method == "POST":
        serializer = serializers.CreateRegistrationSerializer(data=request.data)

        if not serializer.is_valid():
            errors_dict = cast(Dict[str, Any], serializer.errors)
            return utils.validation_error_response(serializer_errors=errors_dict)

        try:
            validated_data = cast(Dict[str, Any], serializer.validated_data)

            result = services.create_registration(
                user=request.user,
                **validated_data,
            )

            return utils.success_response(
                data=result,
                message="Registration created successfully",
                status_code=status.HTTP_201_CREATED,
            )

        except ValueError as e:
            return utils.error_response(
                code="Invalid_registration",
                message=str(e),
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as e:
            return utils.error_response(
                code="Creation_failed",
                message=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def registration_detail(request, registration_id):
    try:
        services.delete_registration(
            registration_id=registration_id,
            user=request.user,
        )
        return utils.success_response(
            message="Registration deleted successfully",
        )

    except PermissionError as e:
        return utils.error_response(
            code="Access_denied",
            message=str(e),
            status_code=status.HTTP_403_FORBIDDEN,
        )

    except ValueError as e:
        return utils.error_response(
            code="Not_found",
            message=str(e),
            status_code=status.HTTP_404_NOT_FOUND,
        )

    except Exception as e:
        return utils.error_response(
            code="Delete_failed",
            message=str(e),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
