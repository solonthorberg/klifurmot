from typing import Any, Dict, cast
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from accounts import permissions
from core import utils

from . import services
from . import serializers


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def climbs(request):
    if request.method == "GET":
        round_id = request.query_params.get("round_id")
        climber_id = request.query_params.get("climber_id")

        if not round_id:
            return utils.error_response(
                code="Missing_parameter",
                message="round_id is required",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if not round_id.isdigit():
            return utils.error_response(
                code="Invalid_parameter",
                message="round_id must be a number",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        climber_id_int = None
        if climber_id:
            if not climber_id.isdigit():
                return utils.error_response(
                    code="Invalid_parameter",
                    message="climber_id must be a number",
                    status_code=status.HTTP_400_BAD_REQUEST,
                )
            climber_id_int = int(climber_id)

        result = services.list_climbs(
            round_id=int(round_id),
            climber_id=climber_id_int,
        )

        return utils.success_response(
            data=result,
            message="Climbs retrieved successfully",
        )

    if request.method == "POST":
        if not permissions.IsCompetitionJudge().has_permission(request, None):
            return utils.error_response(
                code="Access_denied",
                message="Judge access required",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        serializer = serializers.CreateClimbSerializer(data=request.data)

        if not serializer.is_valid():
            errors_dict = cast(Dict[str, Any], serializer.errors)
            return utils.validation_error_response(serializer_errors=errors_dict)

        try:
            validated_data = cast(Dict[str, Any], serializer.validated_data)

            result = services.create_climb(
                user=request.user,
                **validated_data,
            )

            return utils.success_response(
                data=result,
                message="Climb recorded successfully",
                status_code=status.HTTP_201_CREATED,
            )

        except ValueError as e:
            return utils.error_response(
                code="Invalid_climb",
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
@permission_classes([permissions.IsCompetitionAdmin])
def climb_detail(request, climb_id):
    if request.method == "GET":
        try:
            result = services.get_climb(climb_id=climb_id)

            return utils.success_response(
                data=result,
                message="Climb retrieved successfully",
            )

        except ValueError as e:
            return utils.error_response(
                code="Not_found",
                message=str(e),
                status_code=status.HTTP_404_NOT_FOUND,
            )

    if request.method == "PATCH":
        serializer = serializers.UpdateClimbSerializer(data=request.data)

        if not serializer.is_valid():
            errors_dict = cast(Dict[str, Any], serializer.errors)
            return utils.validation_error_response(serializer_errors=errors_dict)

        try:
            validated_data = cast(Dict[str, Any], serializer.validated_data)

            result = services.update_climb(
                climb_id=climb_id,
                user=request.user,
                **validated_data,
            )

            return utils.success_response(
                data=result,
                message="Climb updated successfully",
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
            services.delete_climb(climb_id=climb_id)

            return utils.success_response(
                message="Climb deleted successfully",
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


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def startlist(request):
    if request.method == "GET":
        round_id = request.query_params.get("round_id")

        if not round_id:
            return utils.error_response(
                code="Missing_parameter",
                message="round_id is required",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if not round_id.isdigit():
            return utils.error_response(
                code="Invalid_parameter",
                message="round_id must be a number",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        result = services.list_startlist(round_id=int(round_id))

        return utils.success_response(
            data=result,
            message="Start list retrieved successfully",
        )

    if request.method == "POST":
        if not permissions.IsCompetitionAdmin().has_permission(request, None):
            return utils.error_response(
                code="Access_denied",
                message="Competition admin access required",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        serializer = serializers.CreateStartlistSerializer(data=request.data)

        if not serializer.is_valid():
            errors_dict = cast(Dict[str, Any], serializer.errors)
            return utils.validation_error_response(serializer_errors=errors_dict)

        try:
            validated_data = cast(Dict[str, Any], serializer.validated_data)

            result = services.add_to_startlist(
                user=request.user,
                **validated_data,
            )

            return utils.success_response(
                data=result,
                message="Climber added to start list successfully",
                status_code=status.HTTP_201_CREATED,
            )

        except ValueError as e:
            return utils.error_response(
                code="Invalid_startlist",
                message=str(e),
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as e:
            return utils.error_response(
                code="Creation_failed",
                message=str(e),
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["PATCH", "DELETE"])
@permission_classes([permissions.IsCompetitionAdmin])
def startlist_detail(request, result_id):
    if request.method == "PATCH":
        serializer = serializers.UpdateStartlistSerializer(data=request.data)

        if not serializer.is_valid():
            errors_dict = cast(Dict[str, Any], serializer.errors)
            return utils.validation_error_response(serializer_errors=errors_dict)

        try:
            validated_data = cast(Dict[str, Any], serializer.validated_data)

            result = services.update_startlist(
                result_id=result_id,
                user=request.user,
                **validated_data,
            )

            return utils.success_response(
                data=result,
                message="Start list updated successfully",
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
            services.remove_from_startlist(result_id=result_id)

            return utils.success_response(
                message="Climber removed from start list successfully",
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


@api_view(["GET"])
@permission_classes([AllowAny])
def scores(request):
    round_id = request.query_params.get("round_id")

    if not round_id:
        return utils.error_response(
            code="Missing_parameter",
            message="round_id is required",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    if not round_id.isdigit():
        return utils.error_response(
            code="Invalid_parameter",
            message="round_id must be a number",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    result = services.list_scores(round_id=int(round_id))

    return utils.success_response(
        data=result,
        message="Scores retrieved successfully",
    )


@api_view(["POST"])
@permission_classes([permissions.IsCompetitionAdmin])
def advance_climbers(_, round_id):
    try:
        result = services.advance_climbers(round_id=round_id)

        return utils.success_response(
            data=result,
            message="Climbers advanced successfully",
        )

    except ValueError as e:
        return utils.error_response(
            code="Invalid_round",
            message=str(e),
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as e:
        return utils.error_response(
            code="Advance_failed",
            message=str(e),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
