from django.contrib import admin
from .models import *

# Register your models here.

class ClimberAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'gender', 'date_of_birth')
    search_fields = ('full_name',)
    list_filter = ('gender',)

admin.site.register(Climber, ClimberAdmin)
admin.site.register(CompetitionRegistration)