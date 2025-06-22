from django.contrib import admin
from .models import *
from scoring.utils import AutoAdvanceClimbers
from django.contrib import messages

# Register your models here.

admin.site.register(Competition)
admin.site.register(CategoryGroup)
admin.site.register(CompetitionCategory)
admin.site.register(RoundGroup)
admin.site.register(Boulder)
admin.site.register(JudgeBoulderAssignment)

def advance_top_climbers(modeladmin, request, queryset):
    for round_obj in queryset:
        result = AutoAdvanceClimbers(round_obj)
        if result.get("status") == "ok":
            messages.success(request, f"{result['advanced']} climbers advanced from round {round_obj}")
        else:
            messages.error(request, f"Failed to advance climbers from round {round_obj}: {result.get('message', 'Unknown error')}")

@admin.register(CompetitionRound)
class CompetitionRoundAdmin(admin.ModelAdmin):
    actions = [advance_top_climbers]