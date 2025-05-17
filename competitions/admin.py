from django.contrib import admin
from .models import *

# Register your models here.

class RoundInline(admin.TabularInline):
    model = Round
    extra = 1

class BoulderInline(admin.TabularInline):
    model = Boulder
    extra = 1

class CompetitionCategoryInline(admin.TabularInline):
    model = CompetitionCategory
    extra = 1    

class CompetitionAdmin(admin.ModelAdmin):
    inlines = [CompetitionCategoryInline]
    list_display = ('title', 'start_date', 'end_date', 'location', 'visible')
    search_fields = ('title', 'location')
    list_filter = ('visible',)

class RoundAdmin(admin.ModelAdmin):
    inlines = [BoulderInline]
    list_display = ('round_type', 'competition_category', 'round_order', 'boulder_count', 'completed')
    list_filter = ('round_type', 'completed')

admin.site.register(Competition, CompetitionAdmin)
admin.site.register(CategoryGroup)
admin.site.register(CompetitionCategory)
admin.site.register(Round, RoundAdmin)
admin.site.register(Boulder)
admin.site.register(JudgeBoulderAssignment)