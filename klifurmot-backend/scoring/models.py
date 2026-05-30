from django.conf import settings
from django.db import models

from athletes.models import Climber
from competitions.models import Route, CompetitionRound
from core.models import AuditedSoftDeleteModel


class RoundResult(AuditedSoftDeleteModel):
    round = models.ForeignKey(CompetitionRound, on_delete=models.CASCADE)
    climber = models.ForeignKey(Climber, on_delete=models.CASCADE)
    rank = models.IntegerField(null=True, blank=True)
    start_order = models.IntegerField(null=True, blank=True)
    start_time = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["round", "climber"],
                condition=models.Q(deleted=False),
                name="unique_active_round_result",
            ),
        ]

    def __str__(self):
        return f"Result: {self.climber} - {self.round}"


class Climb(AuditedSoftDeleteModel):
    climber = models.ForeignKey(Climber, on_delete=models.CASCADE)
    route = models.ForeignKey(Route, on_delete=models.CASCADE)
    judge = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    completed = models.BooleanField(default=False)
    # Boulder fields
    attempts_zone = models.IntegerField(null=True, blank=True)
    zone_reached = models.BooleanField(null=True, blank=True)
    attempts_top = models.IntegerField(null=True, blank=True)
    top_reached = models.BooleanField(null=True, blank=True)
    # Lead fields
    hold_reached = models.IntegerField(null=True, blank=True)
    plus_modifier = models.BooleanField(null=True, blank=True)
    time_seconds = models.IntegerField(null=True, blank=True)
    fall_position = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ["route__round", "climber"]
        constraints = [
            models.UniqueConstraint(
                fields=["climber", "route"],
                condition=models.Q(deleted=False),
                name="unique_active_climb",
            ),
        ]

    def __str__(self):
        return f"{self.climber} on {self.route}"


class ClimberRoundScore(AuditedSoftDeleteModel):
    round = models.ForeignKey(CompetitionRound, on_delete=models.CASCADE)
    climber = models.ForeignKey(Climber, on_delete=models.CASCADE)
    total_score = models.DecimalField(max_digits=5, decimal_places=2)
    # Boulder fields
    tops = models.IntegerField(null=True, blank=True)
    zones = models.IntegerField(null=True, blank=True)
    attempts_tops = models.IntegerField(null=True, blank=True)
    attempts_zones = models.IntegerField(null=True, blank=True)
    # Lead fields
    best_hold_reached = models.IntegerField(null=True, blank=True)
    best_time_seconds = models.IntegerField(null=True, blank=True)

    class Meta:
        ordering = ["-total_score"]
        constraints = [
            models.UniqueConstraint(
                fields=["round", "climber"],
                condition=models.Q(deleted=False),
                name="unique_active_round_score",
            ),
        ]

    def __str__(self):
        return f"{self.climber} - {self.total_score} pts in {self.round}"
