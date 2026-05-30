from django.contrib import admin
from django.contrib import messages

from .models import (
    Competition,
    CategoryGroup,
    CompetitionCategory,
    RoundGroup,
    CompetitionRound,
    Route,
)
from scoring import services as scoring_services


admin.site.register(Competition)
admin.site.register(CategoryGroup)
admin.site.register(CompetitionCategory)
admin.site.register(RoundGroup)
admin.site.register(Route)


def advance_top_climbers(_modeladmin, request, queryset):
    for round_obj in queryset:
        try:
            result = scoring_services.advance_climbers(
                round_id=round_obj.id,
                user=request.user,
            )
            messages.success(
                request,
                f"{result['advanced']} climbers advanced from round {round_obj} "
                f"to {result['next_round_name']}",
            )
        except (PermissionError, ValueError) as e:
            messages.error(
                request,
                f"Failed to advance climbers from round {round_obj}: {str(e)}",
            )
        except Exception as e:
            messages.error(
                request,
                f"Unexpected error advancing climbers from round {round_obj}: {str(e)}",
            )


@admin.register(CompetitionRound)
class CompetitionRoundAdmin(admin.ModelAdmin):
    actions = [advance_top_climbers]
