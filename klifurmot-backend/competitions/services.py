from datetime import datetime
import logging
from typing import Any, Dict, Optional
from django.contrib.auth.models import User
from django.db import transaction
from django.core.files.uploadedfile import UploadedFile

from competitions.models import Competition

logger = logging.getLogger(__name__)


def create_competition(
    title: str,
    description: str,
    start_date: datetime,
    end_date: datetime,
    location: str,
    created_by: User,
    image: Optional[UploadedFile] = None,
    visible: bool = True,
) -> Dict[str, Any]:
    """Creates a new competition"""
    if start_date >= end_date:
        raise ValueError("start_date must be before end_date")

    try:
        with transaction.atomic():
            competition = Competition.objects.create(
                title=title,
                description=description,
                start_date=start_date,
                end_date=end_date,
                location=location,
                image=image,
                visible=visible,
                created_by=created_by,
                last_modified_by=created_by,
            )
            return {
                "competition": competition,
            }
    except Exception as e:
        logger.error(f"Failed to create competition: {str(e)}")
        raise
