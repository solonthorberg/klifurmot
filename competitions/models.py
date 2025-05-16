from datetime import timezone
from django.db import models

from accounts.models import UserAccount

# Create your models here.

class Competition(models.Model):
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    location = models.TextField()
    image_url = models.TextField(blank=True, null=True)
    visible = models.BooleanField(default=True)
    created_by = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, related_name='competitions_created')
    created_at = models.DateTimeField(default=timezone.now)
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, related_name='competitions_modified')
    deleted = models.BooleanField(default=False)

class CategoryGroup(models.Model):
    name = models.CharField(max_length=50)
    is_default = models.BooleanField(default=False)

class CompetitionCategory(models.Model):
    GENDER_CHOICES = [('KK', 'Male'), ('KVK', 'Female')]

    competition = models.ForeignKey(Competition, on_delete=models.CASCADE)
    category_group = models.ForeignKey(CategoryGroup, on_delete=models.CASCADE)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, related_name='+')
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, related_name='+')
    deleted = models.BooleanField(default=False)

class Round(models.Model):
    ROUND_TYPES = [('qualification', 'Qualification'), ('semifinal', 'Semifinal'), ('final', 'Final'), ('extra', 'Extra')]

    competition_category = models.ForeignKey(CompetitionCategory, on_delete=models.CASCADE)
    round_type = models.CharField(max_length=20, choices=ROUND_TYPES)
    round_order = models.IntegerField()
    climbers_advance = models.IntegerField(default=0)
    boulder_count = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    is_default = models.BooleanField(default=False)
    created_by = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at = models.DateTimeField(default=timezone.now)
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, related_name='+')
    deleted = models.BooleanField(default=False)

class Boulder(models.Model):
    round = models.ForeignKey(Round, on_delete=models.CASCADE)
    judge = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, blank=True)
    section_style = models.CharField(max_length=50)
    boulder_number = models.IntegerField()
    created_by = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at = models.DateTimeField(default=timezone.now)
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, related_name='+')
    deleted = models.BooleanField(default=False)

class JudgeBoulderAssignment(models.Model):
    judge = models.ForeignKey(UserAccount, on_delete=models.CASCADE)
    boulder = models.ForeignKey(Boulder, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('judge', 'boulder')