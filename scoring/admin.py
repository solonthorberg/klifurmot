from django.contrib import admin
from .models import *

# Register your models here.

class ClimbAdmin(admin.ModelAdmin):
    list_display = ('climber', 'boulder', 'top_reached', 'zone_reached', 'attempts_top', 'attempts_zone')
    list_filter = ('top_reached', 'zone_reached')
    search_fields = ('climber__full_name',)

admin.site.register(RoundResult)
admin.site.register(Climb, ClimbAdmin)
admin.site.register(ClimberRoundScore)