# competitions/apps.py
from django.apps import AppConfig

class CompetitionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'competitions'

    def ready(self):
        import competitions.signals