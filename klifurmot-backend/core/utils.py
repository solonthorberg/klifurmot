from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from typing import Any, Dict, Optional, List


def success_response(
    data: Any = None,
    message: str = "Operation completed successfully",
    status_code: int = status.HTTP_200_OK
) -> Response:
    """
    Standard success response format.
    
    Args:
        data: Response payload
        message: Success message
        status_code: HTTP status code
    
    Returns:
        Response with standardized format
    """
    return Response({
        "success": True,
        "message": message,
        "data": data,
        "timestamp": timezone.now().isoformat()
    }, status=status_code)


def error_response(
    code: str,
    message: str,
    details: Optional[List[str]] = None,
    status_code: int = status.HTTP_400_BAD_REQUEST
) -> Response:
    """
    Standard error response format.
    
    Args:
        code: Error code (e.g., 'Validation_error', 'Username_exists')
        message: Human-readable error message
        details: Optional list of detailed error messages
        status_code: HTTP status code
    
    Returns:
        Response with standardized error format
    """
    return Response({
        "success": False,
        "error": {
            "code": code,
            "message": message,
            "details": details or []
        },
        "timestamp": timezone.now().isoformat()
    }, status=status_code)

def validation_error_response(serializer_errors: Dict) -> Response:
    """
    Convert DRF serializer errors to standard format.
    
    Args:
        serializer_errors: Serializer.errors dict
    
    Returns:
        Standardized validation error response
    """
    details = {}
    duplicate_detected = False

    for field, errors in serializer_errors.items():
        if isinstance(errors, list):
            details[field] = errors
            if any("already exists" in str(e).lower() or "already in use" in str(e).lower() for e in errors):
                duplicate_detected = True
        else:
            details[field] = [errors]
            if "already exists" in str(errors).lower() or "already in use" in str(errors).lower():
                duplicate_detected = True

    if duplicate_detected:
        return error_response(
            code="Duplicate_user",
            message="Username or email already exists",
            details=details,
            status_code=status.HTTP_409_CONFLICT
        )

    return error_response(
        code="Validation_error",
        message="Validation failed",
        details=details,
        status_code=status.HTTP_400_BAD_REQUEST
    )
