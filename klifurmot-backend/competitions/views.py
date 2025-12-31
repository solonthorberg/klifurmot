import logging
from typing import Any, cast, Dict
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes

from accounts import permissions
from . import services
from . import models
from . import serializers
from core import utils

logger = logging.getLogger(__name__)


@api_view(["POST"])
@permission_classes([permissions.IsAdmin])
def create_competition(request):
    """Creates a competition"""

    serializer = serializers.CreateCompetition(data=request.data)

    if not serializer.is_valid():
        errors_dict = cast(Dict[str, Any], serializer.errors)
        return utils.validation_error_response(serializer_errors=errors_dict)

    try:
        result = services.create_competition(**serializer.validated_data)

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


def update_competition(request, id):
    """Updates a competition"""

    serializer = serializers.CreateCompetitionSerializer(data=request.data)

    if not serializer.is_valid():
        errors_dict = cast(Dict[str, Any], serializer.errors)
        return utils.validation_error_response(serializer_errors=errors_dict)

    try:
        result = services.update_competition(id, **serializer.validated_data)

        return utils.success_response(
            data=serializers.CompetitionSerializer(result).data,
            message="Competition updated successfully",
            status_code=status.status.HTTP_200_OK,
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
