from django.utils import timezone
from typing import Optional

from competitions import models


def calculate_age(date_of_birth) -> Optional[int]:
    if not date_of_birth:
        return None
    today = timezone.now().date()
    age = (
        today.year
        - date_of_birth.year
        - ((today.month, today.day) < (date_of_birth.month, date_of_birth.day))
    )
    return age


def get_age_based_category(age):
    category = models.CategoryGroup.objects.filter(
        min_age__lte=age, max_age__gte=age
    ).first()
    return category.name if category else None
