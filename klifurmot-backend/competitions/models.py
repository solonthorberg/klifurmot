from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import AuditedSoftDeleteModel, CompetitionGender


class Competition(AuditedSoftDeleteModel):
    DISCIPLINE_CHOICES = [("boulder", "Boulder"), ("lead", "Lead")]

    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    location = models.TextField()
    image = models.ImageField(upload_to="competitions/", blank=True, null=True)
    visible = models.BooleanField(default=True)
    discipline = models.CharField(
        max_length=10,
        choices=DISCIPLINE_CHOICES,
        default="boulder",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="competitions_created",
    )
    last_modified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="competitions_modified",
    )

    @property
    def status(self):
        now = timezone.now()
        if now < self.start_date:
            return "not_started"
        elif now > self.end_date:
            return "finished"
        else:
            return "ongoing"

    @property
    def is_not_started(self):
        return self.status == "not_started"

    @property
    def is_ongoing(self):
        return self.status == "ongoing"

    @property
    def is_finished(self):
        return self.status == "finished"

    def __str__(self):
        return self.title


class CategoryGroup(models.Model):
    name = models.CharField(max_length=50)
    min_age = models.IntegerField(null=True, blank=True)
    max_age = models.IntegerField(null=True, blank=True)
    is_default = models.BooleanField(default=False)

    class Meta:
        ordering = ["min_age"]

    def __str__(self):
        return self.name

    def contains_birth_year(self, birth_year, competition_year):
        athlete_age = competition_year - birth_year
        if self.min_age is not None and athlete_age < self.min_age:
            return False
        if self.max_age is not None and athlete_age > self.max_age:
            return False
        return True


class CompetitionCategory(AuditedSoftDeleteModel):
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE)
    category_group = models.ForeignKey(CategoryGroup, on_delete=models.CASCADE)
    gender = models.CharField(max_length=6, choices=CompetitionGender.choices)

    def __str__(self):
        return f"{self.competition.title} - {self.category_group.name} ({self.gender})"


class RoundGroup(models.Model):
    name = models.CharField(max_length=50)
    is_default = models.BooleanField(default=False)

    def __str__(self):
        return self.name


class CompetitionRound(AuditedSoftDeleteModel):
    competition_category = models.ForeignKey(
        "CompetitionCategory", on_delete=models.CASCADE
    )
    round_group = models.ForeignKey("RoundGroup", on_delete=models.CASCADE)
    round_order = models.IntegerField()
    climbers_advance = models.IntegerField(null=True, blank=True, default=0)
    route_count = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    is_self_scoring = models.BooleanField(default=False)
    is_default = models.BooleanField(default=False)

    @property
    def status(self):
        """Calculate round status based on dates and completed flag"""
        if self.completed:
            return "completed"

        if not self.start_date or not self.end_date:
            return "scheduled"

        now = timezone.now()
        if now < self.start_date:
            return "not_started"
        elif now > self.end_date:
            return "finished_pending"
        else:
            return "in_progress"

    @property
    def can_advance_climbers(self):
        """Only allow advancing climbers from completed rounds"""
        return self.completed

    @property
    def is_ongoing(self):
        """Check if round is currently happening"""
        if not self.start_date or not self.end_date:
            return False
        now = timezone.now()
        return self.start_date <= now <= self.end_date and not self.completed

    @property
    def is_self_scoring_open(self):
        """Check if self-scoring is currently allowed"""
        if not self.is_self_scoring:
            return False

        if not self.start_date or not self.end_date:
            return True

        now = timezone.now()
        return self.start_date <= now <= self.end_date

    def __str__(self):
        return f"{self.competition_category} - Round {self.round_order}"

    class Meta:
        ordering = ["round_order"]


class Route(AuditedSoftDeleteModel):
    round = models.ForeignKey(CompetitionRound, on_delete=models.CASCADE)
    route_number = models.IntegerField()
    section_style = models.CharField(
        max_length=50, default="general", null=True, blank=True
    )
    image = models.ImageField(upload_to="routes/", blank=True, null=True)

    class Meta:
        ordering = ["route_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["round", "route_number"],
                condition=models.Q(deleted=False),
                name="unique_active_route",
            ),
        ]

    def __str__(self):
        return f"{self.round} - Route {self.route_number}"
