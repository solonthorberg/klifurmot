from django.utils import timezone
from django.db import models

from django.conf import settings

from competitions.models import Competition, CompetitionCategory

# Create your models here.

class Climber(models.Model):
    GENDER_CHOICES = [('KK', 'Male'), ('KVK', 'Female')]

    full_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at = models.DateTimeField(default=timezone.now)
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    deleted = models.BooleanField(default=False)
    def __str__(self):
        return self.full_name

class CompetitionRegistration(models.Model):
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE)
    competition_category = models.ForeignKey(CompetitionCategory, on_delete=models.CASCADE)
    climber = models.ForeignKey(Climber, on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    deleted = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ('competition', 'climber', 'competition_category')

    def __str__(self):
        return f"{self.climber} in {self.competition_category}"