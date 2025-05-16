from datetime import timezone
from django.db import models

from accounts.models import UserAccount
from athletes.models import Climber
from competitions.models import Boulder, Round

# Create your models here.

class RoundResult(models.Model):
    round = models.ForeignKey(Round, on_delete=models.CASCADE)
    climber = models.ForeignKey(Climber, on_delete=models.CASCADE)
    rank = models.IntegerField(null=True, blank=True)
    start_order = models.IntegerField(null=True, blank=True)
    start_time = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at = models.DateTimeField(default=timezone.now)
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, related_name='+')
    deleted = models.BooleanField(default=False)

    class Meta:
        unique_together = ('round', 'climber')

class Climb(models.Model):
    climber = models.ForeignKey(Climber, on_delete=models.CASCADE)
    boulder = models.ForeignKey(Boulder, on_delete=models.CASCADE)
    judge = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, blank=True)
    attempts_zone = models.IntegerField(default=0)
    zone_reached = models.BooleanField(default=False)
    attempts_top = models.IntegerField(default=0)
    top_reached = models.BooleanField(default=False)
    completed = models.BooleanField(default=False)
    created_by = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at = models.DateTimeField(default=timezone.now)
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, related_name='+')
    deleted = models.BooleanField(default=False)

    class Meta:
        unique_together = ('climber', 'boulder')

class ClimberRoundScore(models.Model):
    round = models.ForeignKey(Round, on_delete=models.CASCADE)
    climber = models.ForeignKey(Climber, on_delete=models.CASCADE)
    total_score = models.DecimalField(max_digits=5, decimal_places=2)
    tops = models.IntegerField()
    zones = models.IntegerField()

    class Meta:
        unique_together = ('round', 'climber')