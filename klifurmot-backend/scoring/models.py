from django.conf import settings
from django.db import models

from athletes.models import Climber
from competitions.models import Boulder, CompetitionRound
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
    boulder = models.ForeignKey(Boulder, on_delete=models.CASCADE)
    judge = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    attempts_zone = models.IntegerField(default=0)
    zone_reached = models.BooleanField(default=False)
    attempts_top = models.IntegerField(default=0)
    top_reached = models.BooleanField(default=False)
    completed = models.BooleanField(default=False)

    class Meta:
        ordering = ["boulder__round", "climber"]
        constraints = [
            models.UniqueConstraint(
                fields=["climber", "boulder"],
                condition=models.Q(deleted=False),
                name="unique_active_climb",
            ),
        ]

    def __str__(self):
        return f"{self.climber} on {self.boulder}"


class ClimberRoundScore(AuditedSoftDeleteModel):
    """Aggregated score for a climber in a round.

    Note: created_by and last_modified_by are inherited from the base.
    Previously these fields did not exist on this model; they will be
    NULL for existing rows after the migration.
    """

    round = models.ForeignKey(CompetitionRound, on_delete=models.CASCADE)
    climber = models.ForeignKey(Climber, on_delete=models.CASCADE)
    total_score = models.DecimalField(max_digits=5, decimal_places=2)
    tops = models.IntegerField()
    zones = models.IntegerField()
    attempts_tops = models.IntegerField()
    attempts_zones = models.IntegerField()

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


class SelfScore(AuditedSoftDeleteModel):
    """Self-reported scores by climbers - always editable, no verification.

    Normalized from previous version:
      - `last_updated_at` renamed to `last_modified_at` (matches other models)
      - `last_modified_by` added (NULL for existing rows)
      - `created_by` changed from on_delete=CASCADE to SET_NULL via the base
        (matches the audit pattern used elsewhere)

    See MIGRATION_NOTES.md for the rename-vs-drop-and-recreate concern.
    """

    climber = models.ForeignKey("athletes.Climber", on_delete=models.CASCADE)
    boulder = models.ForeignKey("competitions.Boulder", on_delete=models.CASCADE)
    round = models.ForeignKey("competitions.CompetitionRound", on_delete=models.CASCADE)

    top_reached = models.BooleanField(default=False)
    zone_reached = models.BooleanField(default=False)
    attempts_top = models.IntegerField(default=0)
    attempts_zone = models.IntegerField(default=0)

    class Meta:
        ordering = ["boulder__boulder_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["climber", "boulder"],
                condition=models.Q(deleted=False),
                name="unique_active_self_score",
            ),
        ]

    def __str__(self):
        return f"{self.climber} - Boulder {self.boulder.boulder_number}"
