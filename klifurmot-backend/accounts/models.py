from django.contrib.auth.models import User
from django.db import models

from core.models import AuditedSoftDeleteModel, UserGender


class Country(models.Model):
    country_code = models.CharField(max_length=2, primary_key=True)
    name_en = models.CharField(max_length=100)
    name_local = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.name_local} {self.country_code}"


class UserAccount(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    full_name = models.CharField(max_length=100)
    is_admin = models.BooleanField(default=False)
    google_id = models.CharField(max_length=32, blank=True, null=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=6,
        choices=UserGender.choices,
        null=True,
        blank=True,
    )
    nationality = models.ForeignKey(
        Country, on_delete=models.SET_NULL, null=True, blank=True
    )
    height_cm = models.IntegerField(null=True, blank=True)
    wingspan_cm = models.IntegerField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to="profiles/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_modified_at = models.DateTimeField(auto_now=True)
    last_modified_by = models.ForeignKey(
        "self", on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    reset_token_hash = models.CharField(max_length=128, null=True, blank=True)
    reset_token_created = models.DateTimeField(null=True, blank=True)
    reset_attempts = models.IntegerField(default=0)
    last_reset_attempt = models.DateTimeField(null=True, blank=True)
    deleted = models.BooleanField(default=False, db_index=True)

    def __str__(self):
        return self.user.get_full_name() or self.user.username


class CompetitionRole(AuditedSoftDeleteModel):
    ROLE_CHOICES = [("admin", "Admin"), ("judge", "Judge")]
    user = models.ForeignKey(UserAccount, on_delete=models.CASCADE)
    competition = models.ForeignKey(
        "competitions.Competition", on_delete=models.CASCADE
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "competition", "role"],
                condition=models.Q(deleted=False),
                name="unique_active_competition_role",
            ),
        ]

    def __str__(self):
        return f"{self.user} - {self.role} at {self.competition}"
