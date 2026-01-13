from django.contrib import admin
from .models import RoundResult, Climb, ClimberRoundScore


admin.site.register(RoundResult)
admin.site.register(Climb)
admin.site.register(ClimberRoundScore)
