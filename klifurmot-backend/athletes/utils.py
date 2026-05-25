from django.utils import timezone
from typing import Callable, Optional

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


def build_age_category_resolver() -> Callable[[Optional[int]], Optional[str]]:
    """One DB hit, returns a closure that resolves age → category name.

    Use this when resolving categories for many athletes (lists, startlists).
    For a single athlete, `get_age_based_category` is the convenience wrapper.
    """
    category_groups = list(
        models.CategoryGroup.objects.filter(
            is_default=True,
            min_age__isnull=False,
            max_age__isnull=False,
        )
    )

    def resolve(age: Optional[int]) -> Optional[str]:
        if age is None:
            return None
        for cg in category_groups:
            if cg.min_age is None or cg.max_age is None:
                continue
            if cg.min_age <= age <= cg.max_age:
                return cg.name
        return None

    return resolve


def get_age_based_category(age: Optional[int]) -> Optional[str]:
    return build_age_category_resolver()(age)
