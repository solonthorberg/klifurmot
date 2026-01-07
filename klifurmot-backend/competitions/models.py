from django.utils import timezone
from django.db import models
from django.conf import settings

# Create your models here.


class Competition(models.Model):
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    location = models.TextField()
    image = models.ImageField(upload_to="competitions/", blank=True, null=True)
    visible = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="competitions_created",
    )
    created_at = models.DateTimeField(default=timezone.now)
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="competitions_modified",
    )
    deleted = models.BooleanField(default=False)

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


class CompetitionCategory(models.Model):
    GENDER_CHOICES = [("KK", "KK"), ("KVK", "KVK")]

    competition = models.ForeignKey(Competition, on_delete=models.CASCADE)
    category_group = models.ForeignKey(CategoryGroup, on_delete=models.CASCADE)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    deleted = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.competition.title} - {self.category_group.name} {self.get_gender_display()}"


class RoundGroup(models.Model):
    name = models.CharField(max_length=50)
    is_default = models.BooleanField(default=False)

    def __str__(self):
        return self.name


class CompetitionRound(models.Model):
    competition_category = models.ForeignKey(
        "CompetitionCategory", on_delete=models.CASCADE
    )
    round_group = models.ForeignKey("RoundGroup", on_delete=models.CASCADE)
    round_order = models.IntegerField()
    climbers_advance = models.IntegerField(default=0)
    boulder_count = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    is_self_scoring = models.BooleanField(default=False)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    created_at = models.DateTimeField(default=timezone.now)
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    deleted = models.BooleanField(default=False)

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


class Boulder(models.Model):
    round = models.ForeignKey(CompetitionRound, on_delete=models.CASCADE)
    boulder_number = models.IntegerField()
    section_style = models.CharField(max_length=50, default="general")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    created_at = models.DateTimeField(default=timezone.now)
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="+"
    )
    deleted = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.round} - Boulder {self.boulder_number}"

    class Meta:
        ordering = ["boulder_number"]
        unique_together = ["round", "boulder_number"]


class JudgeBoulderAssignment(models.Model):
    judge = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    boulder = models.ForeignKey(Boulder, on_delete=models.CASCADE)

    class Meta:
        unique_together = ("judge", "boulder")

    def __str__(self):
        return f"{self.judge} - {self.boulder}"
