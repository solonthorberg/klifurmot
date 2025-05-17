from django.conf import settings
from django.utils import timezone
import uuid
from django.db import models

from competitions.models import Competition

# Create your models here.

class Country(models.Model):
    country_code = models.CharField(max_length=2, primary_key=True)
    name_en = models.CharField(max_length=100)
    name_local = models.CharField(max_length=100)
    def __str__(self):
        return f"{self.name_local} ({self.country_code})"
        

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

from .models import Country  # or wherever Country is defined

class UserAccount(models.Model):
    GENDER_CHOICES = [('KK', 'KK'), ('KVK', 'KVK')]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')

    is_admin = models.BooleanField(default=False)
    google_id = models.CharField(max_length=32, blank=True, null=True)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, null=True, blank=True)
    nationality = models.ForeignKey(Country, on_delete=models.SET_NULL, null=True, blank=True)
    height_cm = models.IntegerField(null=True, blank=True)
    wingspan_cm = models.IntegerField(null=True, blank=True)
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_modified_at = models.DateTimeField(auto_now=True)
    last_modified_by = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True, related_name='+'
    )
    deleted = models.BooleanField(default=False)

    def __str__(self):
        return self.user.get_full_name() or self.user.username


class CompetitionRole(models.Model):
    ROLE_CHOICES = [('admin', 'Admin'), ('judge', 'Judge')]

    user = models.ForeignKey(UserAccount, on_delete=models.CASCADE)
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    created_by = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at = models.DateTimeField(default=timezone.now)
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, related_name='+')
    deleted = models.BooleanField(default=False)

    class Meta:
        unique_together = ('user', 'competition', 'role')

    def __str__(self):
        return f"{self.user} - {self.role} at {self.competition}"

class JudgeLink(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='judge_links_as_user'
    )
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE)
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='judge_links_created'
    )
    def __str__(self):
        return f"Judge Link for {self.user} in {self.competition}"