from django.utils import timezone
from django.db import models
from django.conf import settings
from athletes.models import Climber
from competitions.models import Boulder, CompetitionRound

# Create your models here.


class RoundResult(models.Model):
    round = models.ForeignKey(CompetitionRound, on_delete=models.CASCADE)
    climber = models.ForeignKey(Climber, on_delete=models.CASCADE)
    rank = models.IntegerField(null=True, blank=True)
    start_order = models.IntegerField(null=True, blank=True)
    start_time = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    created_at = models.DateTimeField(default=timezone.now)
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    deleted = models.BooleanField(default=False)

    class Meta:
        unique_together = ("round", "climber")

    def __str__(self):
        return f"Result: {self.climber} - {self.round}"


class Climb(models.Model):
    climber = models.ForeignKey(Climber, on_delete=models.CASCADE)
    boulder = models.ForeignKey(Boulder, on_delete=models.CASCADE)
    judge = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    attempts_zone = models.IntegerField(default=0)
    zone_reached = models.BooleanField(default=False)
    attempts_top = models.IntegerField(default=0)
    top_reached = models.BooleanField(default=False)
    completed = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    created_at = models.DateTimeField(default=timezone.now)
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    deleted = models.BooleanField(default=False)

    class Meta:
        unique_together = ("climber", "boulder")
        ordering = ["boulder__round", "climber"]

    def __str__(self):
        return f"{self.climber} on {self.boulder}"


class ClimberRoundScore(models.Model):
    round = models.ForeignKey(CompetitionRound, on_delete=models.CASCADE)
    climber = models.ForeignKey(Climber, on_delete=models.CASCADE)
    total_score = models.DecimalField(max_digits=5, decimal_places=2)
    tops = models.IntegerField()
    zones = models.IntegerField()
    attempts_tops = models.IntegerField()
    attempts_zones = models.IntegerField()
    created_at = models.DateTimeField(default=timezone.now)
    last_modified_at = models.DateTimeField(default=timezone.now)
    deleted = models.BooleanField(default=False)

    class Meta:
        unique_together = ("round", "climber")
        ordering = ["-total_score"]

    def __str__(self):
        return f"{self.climber} - {self.total_score} pts in {self.round}"


class SelfScore(models.Model):
    """Self-reported scores by climbers - always editable, no verification"""

    climber = models.ForeignKey("athletes.Climber", on_delete=models.CASCADE)
    boulder = models.ForeignKey("competitions.Boulder", on_delete=models.CASCADE)
    round = models.ForeignKey("competitions.CompetitionRound", on_delete=models.CASCADE)

    top_reached = models.BooleanField(default=False)
    zone_reached = models.BooleanField(default=False)
    attempts_top = models.IntegerField(default=0)
    attempts_zone = models.IntegerField(default=0)

    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="self_scores_created",
    )
    last_updated_at = models.DateTimeField(auto_now=True)
    deleted = models.BooleanField(default=False)

    class Meta:
        unique_together = ("climber", "boulder")
        ordering = ["boulder__boulder_number"]

    def __str__(self):
        return f"{self.climber} - Boulder {self.boulder.boulder_number}"
