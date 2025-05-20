from django.contrib import admin
from .models import *

#Register your models here.

admin.site.register(Competition)
admin.site.register(CategoryGroup)
admin.site.register(CompetitionCategory)
admin.site.register(CompetitionRound)
admin.site.register(RoundGroup)
admin.site.register(Boulder)
admin.site.register(JudgeBoulderAssignment)