import logging
from typing import Any, cast, Dict
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

from accounts import permissions
from . import services
from . import serializers
from core import utils

logger = logging.getLogger(__name__)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def competitions(request):
    if request.method == "GET":
        year_param = request.query_params.get("year")
        year = int(year_param) if year_param and year_param.isdigit() else None

        result = services.list_competitions(year=year)

        return utils.success_response(
            data=serializers.CompetitionSerializer(result, many=True).data,
            message="Competitions retrieved successfully",
        )

    if request.method == "POST":
        if not permissions.IsAdmin().has_permission(request, None):
            return utils.error_response(
                code="Access_denied",
                message="Admin access required",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        serializer = serializers.CreateCompetitionSerializer(data=request.data)

        if not serializer.is_valid():
            errors_dict = cast(Dict[str, Any], serializer.errors)
            return utils.validation_error_response(serializer_errors=errors_dict)

        try:
            validated_data = cast(Dict[str, Any], serializer.validated_data)

            result = services.create_competition(
                created_by=request.user,
                **validated_data,
            )

            return utils.success_response(
                data=serializers.CompetitionSerializer(result).data,
                message="Competition created successfully",
                status_code=status.HTTP_201_CREATED,
            )

        except ValueError as e:
            return utils.error_response(
                code="Invalid_competition",
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
@permission_classes([AllowAny])
def competition_detail(request, competition_id):
    if request.method == "GET":
        try:
            result = services.get_competition(competition_id=competition_id)

            return utils.success_response(
                data=serializers.CompetitionSerializer(result).data,
                message="Competition retrieved successfully",
            )

        except ValueError as e:
            return utils.error_response(
                code="Not_found",
                message=str(e),
                status_code=status.HTTP_404_NOT_FOUND,
            )

    if request.method == "PATCH":
        if not permissions.IsCompetitionAdmin().has_permission(request, None):
            return utils.error_response(
                code="Access_denied",
                message="Competition admin access required",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        serializer = serializers.UpdateCompetitionSerializer(data=request.data)

        if not serializer.is_valid():
            errors_dict = cast(Dict[str, Any], serializer.errors)
            return utils.validation_error_response(serializer_errors=errors_dict)

        try:
            validated_data = cast(Dict[str, Any], serializer.validated_data)

            result = services.update_competition(
                competition_id=competition_id,
                user=request.user,
                **validated_data,
            )

            return utils.success_response(
                data=serializers.CompetitionSerializer(result).data,
                message="Competition updated successfully",
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
        if not permissions.IsAdmin().has_permission(request, None):
            return utils.error_response(
                code="Access_denied",
                message="Admin access required",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        try:
            services.delete_competition(competition_id=competition_id)

            return utils.success_response(
                message="Competition deleted successfully",
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
def competition_athletes(_request, competition_id):
    try:
        result = services.get_competition_athletes(competition_id=competition_id)

        return utils.success_response(
            data=result,
            message="Athletes retrieved successfully",
        )

    except ValueError as e:
        return utils.error_response(
            code="Not_found",
            message=str(e),
            status_code=status.HTTP_404_NOT_FOUND,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def competition_boulders(_request, competition_id):
    try:
        result = services.get_competition_boulders(competition_id=competition_id)

        return utils.success_response(
            data=result,
            message="Boulders retrieved successfully",
        )

    except ValueError as e:
        return utils.error_response(
            code="Not_found",
            message=str(e),
            status_code=status.HTTP_404_NOT_FOUND,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def competition_startlist(_request, competition_id):
    try:
        result = services.get_competition_startlist(competition_id=competition_id)

        return utils.success_response(
            data=result,
            message="Startlist retrieved successfully",
        )

    except ValueError as e:
        return utils.error_response(
            code="Not_found",
            message=str(e),
            status_code=status.HTTP_404_NOT_FOUND,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def competition_results(_request, competition_id):
    try:
        result = services.get_competition_results(competition_id=competition_id)

        return utils.success_response(
            data=result,
            message="Results retrieved successfully",
        )

    except ValueError as e:
        return utils.error_response(
            code="Not_found",
            message=str(e),
            status_code=status.HTTP_404_NOT_FOUND,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def list_rounds(request):
    competition_id = request.query_params.get("competition_id")

    if not competition_id:
        return utils.error_response(
            code="Missing_parameter",
            message="competition_id is required",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    if not competition_id.isdigit():
        return utils.error_response(
            code="Invalid_parameter",
            message="competition_id must be a number",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    result = services.list_rounds(competition_id=int(competition_id))

    return utils.success_response(
        data=serializers.RoundSerializer(result, many=True).data,
        message="Rounds retrieved successfully",
    )


@api_view(["POST"])
@permission_classes([permissions.IsCompetitionAdmin])
def create_round(request, competition_id):
    serializer = serializers.CreateRoundSerializer(data=request.data)

    if not serializer.is_valid():
        errors_dict = cast(Dict[str, Any], serializer.errors)
        return utils.validation_error_response(serializer_errors=errors_dict)

    try:
        validated_data = cast(Dict[str, Any], serializer.validated_data)

        result = services.create_round(
            competition_id=competition_id,
            user=request.user,
            **validated_data,
        )

        return utils.success_response(
            data=serializers.RoundSerializer(result).data,
            message="Round created successfully",
            status_code=status.HTTP_201_CREATED,
        )

    except PermissionError as e:
        return utils.error_response(
            code="Not_allowed",
            message=str(e),
            status_code=status.HTTP_403_FORBIDDEN,
        )

    except ValueError as e:
        return utils.error_response(
            code="Invalid_round",
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
@permission_classes([AllowAny])
def round_detail(request, round_id):
    if request.method == "GET":
        try:
            result = services.get_round(round_id=round_id)

            return utils.success_response(
                data=serializers.RoundSerializer(result).data,
                message="Round retrieved successfully",
            )

        except ValueError as e:
            return utils.error_response(
                code="Not_found",
                message=str(e),
                status_code=status.HTTP_404_NOT_FOUND,
            )

    if request.method == "PATCH":
        if not permissions.IsCompetitionAdmin().has_permission(request, None):
            return utils.error_response(
                code="Access_denied",
                message="Competition admin access required",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        serializer = serializers.UpdateRoundSerializer(data=request.data)

        if not serializer.is_valid():
            errors_dict = cast(Dict[str, Any], serializer.errors)
            return utils.validation_error_response(serializer_errors=errors_dict)

        try:
            validated_data = cast(Dict[str, Any], serializer.validated_data)

            result = services.update_round(
                round_id=round_id,
                user=request.user,
                **validated_data,
            )

            return utils.success_response(
                data=serializers.RoundSerializer(result).data,
                message="Round updated successfully",
            )

        except PermissionError as e:
            return utils.error_response(
                code="Not_allowed",
                message=str(e),
                status_code=status.HTTP_403_FORBIDDEN,
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
        if not permissions.IsCompetitionAdmin().has_permission(request, None):
            return utils.error_response(
                code="Access_denied",
                message="Competition admin access required",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        try:
            services.delete_round(round_id=round_id)

            return utils.success_response(
                message="Round deleted successfully",
            )

        except PermissionError as e:
            return utils.error_response(
                code="Not_allowed",
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


@api_view(["PATCH"])
@permission_classes([permissions.IsCompetitionAdmin])
def round_status(request, round_id):
    serializer = serializers.UpdateRoundStatusSerializer(data=request.data)

    if not serializer.is_valid():
        errors_dict = cast(Dict[str, Any], serializer.errors)
        return utils.validation_error_response(serializer_errors=errors_dict)

    try:
        validated_data = cast(Dict[str, Any], serializer.validated_data)

        result = services.update_round_status(
            round_id=round_id,
            user=request.user,
            **validated_data,
        )

        return utils.success_response(
            data=serializers.RoundSerializer(result).data,
            message="Round status updated successfully",
        )

    except ValueError as e:
        return utils.error_response(
            code="Not_found",
            message=str(e),
            status_code=status.HTTP_404_NOT_FOUND,
        )

    except Exception as e:
        return utils.error_response(
            code="Update_failed",
            message=str(e),
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def round_groups(_request):
    result = services.list_round_groups()

    return utils.success_response(
        data=serializers.RoundGroupSerializer(result, many=True).data,
        message="Round groups retrieved successfully",
    )


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def categories(request):
    if request.method == "GET":
        competition_id = request.query_params.get("competition_id")

        if not competition_id:
            return utils.error_response(
                code="Missing_parameter",
                message="competition_id is required",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        if not competition_id.isdigit():
            return utils.error_response(
                code="Invalid_parameter",
                message="competition_id must be a number",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        result = services.list_categories(competition_id=int(competition_id))

        return utils.success_response(
            data=serializers.CompetitionCategorySerializer(result, many=True).data,
            message="Competition categories retrieved successfully",
        )

    if request.method == "POST":
        if not permissions.IsCompetitionAdmin().has_permission(request, None):
            return utils.error_response(
                code="Access_denied",
                message="Competition admin access required",
                status_code=status.HTTP_403_FORBIDDEN,
            )

        serializer = serializers.CreateCompetitionCategorySerializer(data=request.data)

        if not serializer.is_valid():
            errors_dict = cast(Dict[str, Any], serializer.errors)
            return utils.validation_error_response(serializer_errors=errors_dict)

        try:
            validated_data = cast(Dict[str, Any], serializer.validated_data)

            result = services.create_category(
                competition_id=validated_data["competition"],
                category_group_id=validated_data["category_group"],
                gender=validated_data["gender"],
                user=request.user,
            )

            return utils.success_response(
                data=serializers.CompetitionCategorySerializer(result).data,
                message="Category created successfully",
                status_code=status.HTTP_201_CREATED,
            )

        except PermissionError as e:
            return utils.error_response(
                code="Not_allowed",
                message=str(e),
                status_code=status.HTTP_403_FORBIDDEN,
            )

        except ValueError as e:
            return utils.error_response(
                code="Invalid_category",
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
def category_detail(request, category_id):
    if request.method == "PATCH":
        serializer = serializers.UpdateCompetitionCategorySerializer(data=request.data)

        if not serializer.is_valid():
            errors_dict = cast(Dict[str, Any], serializer.errors)
            return utils.validation_error_response(serializer_errors=errors_dict)

        try:
            validated_data = cast(Dict[str, Any], serializer.validated_data)

            result = services.update_category(
                category_id=category_id,
                user=request.user,
                **validated_data,
            )

            return utils.success_response(
                data=serializers.CompetitionCategorySerializer(result).data,
                message="Category updated successfully",
            )

        except PermissionError as e:
            return utils.error_response(
                code="Not_allowed",
                message=str(e),
                status_code=status.HTTP_403_FORBIDDEN,
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
            services.delete_category(category_id=category_id)

            return utils.success_response(
                message="Category deleted successfully",
            )

        except PermissionError as e:
            return utils.error_response(
                code="Not_allowed",
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


@api_view(["GET"])
@permission_classes([AllowAny])
def category_groups(_request):
    result = services.list_category_groups()

    return utils.success_response(
        data=serializers.CategoryGroupSerializer(result, many=True).data,
        message="Category groups retrieved successfully",
    )
