from django.contrib import admin
from .models import *
from scoring.utils import auto_advance_climbers  # Make sure this import is valid

@admin.action(description="Advance top climbers to next round")
def advance_top_climbers(modeladmin, request, queryset):
    for round_obj in queryset:
        result = auto_advance_climbers(round_obj)
        modeladmin.message_user(
            request, f"{result['advanced']} climbers advanced from round {round_obj}"
        )

@admin.register(CompetitionRound)
class CompetitionRoundAdmin(admin.ModelAdmin):
    actions = [advance_top_climbers]

# Register other models as usual
admin.site.register(Competition)
admin.site.register(CategoryGroup)
admin.site.register(CompetitionCategory)
admin.site.register(RoundGroup)
admin.site.register(Boulder)
admin.site.register(JudgeBoulderAssignment)
