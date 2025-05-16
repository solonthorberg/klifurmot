from django.contrib import admin
from .models import *

# Register your models here.

admin.site.register(Country)
admin.site.register(UserAccount)
admin.site.register(CompetitionRole)
admin.site.register(JudgeLink)

