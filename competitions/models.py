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
    image = models.ImageField(upload_to='competitions/', blank=True, null=True)
    visible = models.BooleanField(default=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='competitions_created')
    created_at = models.DateTimeField(default=timezone.now)
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='competitions_modified')
    deleted = models.BooleanField(default=False)
    def __str__(self):
        return self.title
    

class CategoryGroup(models.Model):
    name = models.CharField(max_length=50)
    is_default = models.BooleanField(default=False)
    def __str__(self):
        return self.name

class CompetitionCategory(models.Model):
    GENDER_CHOICES = [('KK', 'KK'), ('KVK', 'KVK')]

    competition = models.ForeignKey(Competition, on_delete=models.CASCADE)
    category_group = models.ForeignKey(CategoryGroup, on_delete=models.CASCADE)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    deleted = models.BooleanField(default=False)
    def __str__(self):
        return f"{self.category_group.name} {self.get_gender_display()}"

class RoundGroup(models.Model):
    name = models.CharField(max_length=50)
    is_default = models.BooleanField(default=False)
    def __str__(self):
        return self.name

class CompetitionRound(models.Model):
    competition_category = models.ForeignKey(CompetitionCategory, on_delete=models.CASCADE)
    round_group = models.ForeignKey(RoundGroup, on_delete=models.CASCADE)
    round_order = models.IntegerField()
    climbers_advance = models.IntegerField(default=0)
    boulder_count = models.IntegerField(default=0)
    completed = models.BooleanField(default=False)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    is_default = models.BooleanField(default=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at = models.DateTimeField(default=timezone.now)
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    deleted = models.BooleanField(default=False)

    def __str__(self):
        return f"Round {self.round_order} - {self.competition_category}"
    
    class Meta:
        ordering = ['round_order']


class Boulder(models.Model):
    round = models.ForeignKey(CompetitionRound, on_delete=models.CASCADE)
    judge = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    section_style = models.CharField(max_length=50)
    boulder_number = models.IntegerField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at = models.DateTimeField(default=timezone.now)
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    deleted = models.BooleanField(default=False)

    def __str__(self):
        return f"Boulder {self.boulder_number} - {self.round}"
    
    class Meta:
        ordering = ['boulder_number']

class JudgeBoulderAssignment(models.Model):
    judge = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    boulder = models.ForeignKey(Boulder, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('judge', 'boulder')
        
    def __str__(self):
        return f"{self.judge} - {self.boulder}"
    