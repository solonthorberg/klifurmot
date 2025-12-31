import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.models import User
from typing import Dict, cast, Any

from core import utils
from accounts import permissions
from competitions.models import Competition
from .models import JudgeLink

from . import services
from . import serializers

logger = logging.getLogger(__name__)

# Create your views here.


@api_view(["POST"])
@permission_classes([permissions.IsCompetitionAdmin])
def send_invitation(request, competition_id):
    """Send a judge invitation via link"""

    serializer = serializers.SendInvitationSerializer(data=request.data)
    if not serializer.is_valid():
        errors_dict = cast(Dict[str, Any], serializer.errors)
        return utils.validation_error_response(serializer_errors=errors_dict)

    try:
        result = services.send_judge_invitation(
            competition_id=competition_id,
            user=request.user,
            **cast(Dict[str, Any], serializer.validated_data),
        )

        message_map = {
            "updated_invitation": "Existing invitation updated with new expiration date",
            "new_user": "Invitation sent successfully",
            "existing_user": "Judge link created successfully",
        }
        message = message_map.get(result["type"], "Judge link updated successfully")

        return utils.success_response(
            data=serializers.SendInvitationResponseSerializer(
                result, context={"request": request}
            ).data,
            message=message,
            status_code=status.HTTP_201_CREATED,
        )

    except Competition.DoesNotExist:
        return utils.error_response(
            code="Competition_not_found",
            message="Competition not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    except PermissionError as e:
        return utils.error_response(
            code="Access_denied", message=str(e), status_code=status.HTTP_403_FORBIDDEN
        )

    except ValueError as e:
        return utils.error_response(
            code="Invalid_data", message=str(e), status_code=status.HTTP_400_BAD_REQUEST
        )

    except Exception as e:
        logger.error(f"Unexpected error sending invitation: {str(e)}")
        return utils.error_response(
            code="Server_error",
            message="Failed to send invitation",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([AllowAny])
def validate_invitation(token):
    """Validate a judge invitation token"""

    try:
        result = services.validate_invitation(token=token)

        return utils.success_response(
            data=serializers.ValidateInvitationResponseSerializer(result).data,
            message="Invitation is valid",
        )

    except JudgeLink.DoesNotExist:
        return utils.error_response(
            code="Invalid_invitation",
            message="Invalid or expired invitation",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    except ValueError as e:
        return utils.error_response(
            code="Invalid_invitation",
            message=str(e),
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as e:
        logger.error(f"Unexpected error validating invitation: {str(e)}")
        return utils.error_response(
            code="Server_error",
            message="Failed to validate invitation",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([AllowAny])
def claim_invitation(request, token):
    """Claim a judge invitation"""

    try:
        result = services.claim_invitation(
            token=token, user=request.user if request.user.is_authenticated else None
        )

        if not result["authenticated"]:
            return utils.success_response(
                data=serializers.ClaimInvitationUnauthenticatedResponseSerializer(
                    result
                ).data,
                message="Authentication required",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        return utils.success_response(
            data={"competition_id": result["competition_id"]},
            message="Invitation claimed successfully",
        )

    except JudgeLink.DoesNotExist:
        return utils.error_response(
            code="Invalid_invitation",
            message="Invalid or expired invitation",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    except ValueError as e:
        return utils.error_response(
            code="Invalid_invitation",
            message=str(e),
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    except PermissionError as e:
        return utils.error_response(
            code="Access_denied", message=str(e), status_code=status.HTTP_403_FORBIDDEN
        )

    except Exception as e:
        logger.error(f"Unexpected error claiming invitation: {str(e)}")
        return utils.error_response(
            code="Server_error",
            message="Failed to claim invitation",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_competition_invitations(request, competition_id):
    """Get all invitations for a competition"""

    try:
        result = services.get_competition_invitations(
            competition_id=competition_id, user=request.user
        )

        return utils.success_response(
            data=result["invitations"], message="Invitations retrieved successfully"
        )

    except Competition.DoesNotExist:
        return utils.error_response(
            code="Competition_not_found",
            message="Competition not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    except PermissionError as e:
        return utils.error_response(
            code="Access_denied", message=str(e), status_code=status.HTTP_403_FORBIDDEN
        )

    except Exception as e:
        logger.error(f"Unexpected error retrieving invitations: {str(e)}")
        return utils.error_response(
            code="Server_error",
            message="Failed to retrieve invitations",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([permissions.IsCompetitionAdmin])
def create_judge_link(request, competition_id):
    """Create a judge link for an existing user"""

    serializer = serializers.CreateJudgeLinkSerializer(data=request.data)
    if not serializer.is_valid():
        errors_dict = cast(Dict[str, Any], serializer.errors)
        return utils.validation_error_response(serializer_errors=errors_dict)

    try:
        result = services.create_judge_link(
            competition_id=competition_id,
            user=request.user,
            **cast(Dict[str, Any], serializer.validated_data),
        )

        return utils.success_response(
            data=serializers.JudgeLinkResponseSerializer(
                result, context={"request": request}
            ).data,
            message="Judge link created successfully"
            if result["created"]
            else "Judge link updated",
            status_code=status.HTTP_201_CREATED
            if result["created"]
            else status.HTTP_200_OK,
        )

    except Competition.DoesNotExist:
        return utils.error_response(
            code="Competition_not_found",
            message="Competition not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    except User.DoesNotExist:
        return utils.error_response(
            code="User_not_found",
            message="User not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    except PermissionError as e:
        return utils.error_response(
            code="Access_denied", message=str(e), status_code=status.HTTP_403_FORBIDDEN
        )

    except ValueError as e:
        return utils.error_response(
            code="Invalid_data", message=str(e), status_code=status.HTTP_400_BAD_REQUEST
        )

    except Exception as e:
        logger.error(f"Unexpected error creating judge link: {str(e)}")
        return utils.error_response(
            code="Server_error",
            message="Failed to create judge link",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def validate_judge_link(request, token):
    """Validate a judge link token"""

    try:
        result = services.validate_judge_link(token=token, user=request.user)

        return utils.success_response(
            data=serializers.ValidateJudgeLinkResponseSerializer(result).data,
            message="Judge link is valid",
        )

    except JudgeLink.DoesNotExist:
        return utils.error_response(
            code="Link_not_found",
            message="Invalid token",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    except ValueError as e:
        return utils.error_response(
            code="Invalid_link", message=str(e), status_code=status.HTTP_400_BAD_REQUEST
        )

    except PermissionError as e:
        return utils.error_response(
            code="Access_denied", message=str(e), status_code=status.HTTP_403_FORBIDDEN
        )

    except Exception as e:
        logger.error(f"Unexpected error validating judge link: {str(e)}")
        return utils.error_response(
            code="Server_error",
            message="Failed to validate judge link",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_competition_judge_links(request, competition_id):
    """Get all judge links for a competition"""

    try:
        result = services.get_competition_judge_links(
            competition_id=competition_id, user=request.user
        )

        return utils.success_response(
            data=result["links"], message="Judge links retrieved successfully"
        )

    except Competition.DoesNotExist:
        return utils.error_response(
            code="Competition_not_found",
            message="Competition not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    except PermissionError as e:
        return utils.error_response(
            code="Access_denied", message=str(e), status_code=status.HTTP_403_FORBIDDEN
        )

    except Exception as e:
        logger.error(f"Unexpected error retrieving judge links: {str(e)}")
        return utils.error_response(
            code="Server_error",
            message="Failed to retrieve judge links",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["PATCH", "DELETE"])
@permission_classes([permissions.IsCompetitionAdmin])
def manage_judge_link(request, link_id):
    """Update or delete a judge link"""

    if request.method == "PATCH":
        serializer = serializers.UpdateJudgeLinkSerializer(data=request.data)
        if not serializer.is_valid():
            errors_dict = cast(Dict[str, Any], serializer.errors)
            return utils.validation_error_response(serializer_errors=errors_dict)

        try:
            result = services.update_judge_link(
                link_id=link_id,
                user=request.user,
                **cast(Dict[str, Any], serializer.validated_data),
            )

            return utils.success_response(
                data={
                    "id": result["judge_link"].id,
                    "expires_at": result["judge_link"].expires_at,
                },
                message="Judge link updated successfully",
            )

        except JudgeLink.DoesNotExist:
            return utils.error_response(
                code="Link_not_found",
                message="Judge link not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        except PermissionError as e:
            return utils.error_response(
                code="Access_denied",
                message=str(e),
                status_code=status.HTTP_403_FORBIDDEN,
            )

        except ValueError as e:
            return utils.error_response(
                code="Invalid_data",
                message=str(e),
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as e:
            logger.error(f"Unexpected error updating judge link: {str(e)}")
            return utils.error_response(
                code="Server_error",
                message="Failed to update judge link",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    elif request.method == "DELETE":
        try:
            services.delete_judge_link(link_id=link_id, user=request.user)

            return utils.success_response(
                data=None, message="Judge link deleted successfully"
            )

        except JudgeLink.DoesNotExist:
            return utils.error_response(
                code="Link_not_found",
                message="Judge link not found",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        except PermissionError as e:
            return utils.error_response(
                code="Access_denied",
                message=str(e),
                status_code=status.HTTP_403_FORBIDDEN,
            )

        except Exception as e:
            logger.error(f"Unexpected error deleting judge link: {str(e)}")
            return utils.error_response(
                code="Server_error",
                message="Failed to delete judge link",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["GET"])
@permission_classes([permissions.IsCompetitionAdmin])
def get_all_judges(request, competition_id):
    """Get all judges (both invitations and links) for a competition"""

    try:
        invitations_result = services.get_competition_invitations(
            competition_id=competition_id, user=request.user
        )

        links_result = services.get_competition_judge_links(
            competition_id=competition_id, user=request.user
        )

        return utils.success_response(
            data={
                "invitations": invitations_result["invitations"],
                "links": links_result["links"],
                "total_count": len(invitations_result["invitations"])
                + len(links_result["links"]),
            },
            message="Judges retrieved successfully",
        )

    except Competition.DoesNotExist:
        return utils.error_response(
            code="Competition_not_found",
            message="Competition not found",
            status_code=status.HTTP_404_NOT_FOUND,
        )

    except PermissionError as e:
        return utils.error_response(
            code="Access_denied", message=str(e), status_code=status.HTTP_403_FORBIDDEN
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_potential_judges(request):
    """Get list of users who can be assigned as judges"""

    try:
        result = services.get_potential_judges(user=request.user)

        return utils.success_response(
            data=result["judges"], message="Potential judges retrieved successfully"
        )

    except PermissionError as e:
        return utils.error_response(
            code="Access_denied", message=str(e), status_code=status.HTTP_403_FORBIDDEN
        )

    except Exception as e:
        logger.error(f"Unexpected error getting potential judges: {str(e)}")
        return utils.error_response(
            code="Server_error",
            message="Failed to retrieve potential judges",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
