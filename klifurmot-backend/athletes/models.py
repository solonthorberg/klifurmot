from django.db import models
from django.utils import timezone

from core.models import AuditedSoftDeleteModel, UserGender


class Climber(AuditedSoftDeleteModel):
    user_account = models.OneToOneField(
        "accounts.UserAccount", on_delete=models.CASCADE, null=True, blank=True
    )

    simple_name = models.CharField(max_length=100, blank=True, null=True)
    simple_age = models.IntegerField(blank=True, null=True)
    simple_gender = models.CharField(
        max_length=6,
        choices=UserGender.choices,
        blank=True,
        null=True,
    )
    is_simple_athlete = models.BooleanField(default=False)

    def __str__(self):
        if self.is_simple_athlete and self.simple_name:
            return self.simple_name
        elif self.user_account and self.user_account.full_name:
            return self.user_account.full_name
        return f"Climber {self.pk}"

    def get_full_name(self):
        if self.is_simple_athlete:
            return self.simple_name or "Unknown"
        elif self.user_account:
            return self.user_account.full_name or "Unknown"
        return "Unknown"

    def get_gender(self):
        if self.is_simple_athlete:
            return self.simple_gender
        elif self.user_account:
            return self.user_account.gender
        return None

    def get_age(self):
        if self.is_simple_athlete:
            return self.simple_age
        elif self.user_account and self.user_account.date_of_birth:
            return timezone.now().year - self.user_account.date_of_birth.year
        return None


class CompetitionRegistration(AuditedSoftDeleteModel):
    competition = models.ForeignKey(
        "competitions.Competition", on_delete=models.CASCADE
    )
    competition_category = models.ForeignKey(
        "competitions.CompetitionCategory", on_delete=models.CASCADE
    )
    climber = models.ForeignKey(Climber, on_delete=models.CASCADE)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["competition", "climber", "competition_category"],
                condition=models.Q(deleted=False),
                name="unique_active_registration",
            ),
        ]

    def __str__(self):
        return f"{self.climber} in {self.competition_category}"
