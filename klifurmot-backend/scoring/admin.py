from django.contrib import admin
from .models import *

#Register your models here.

admin.site.register(RoundResult)
admin.site.register(Climb)
admin.site.register(ClimberRoundScore)

