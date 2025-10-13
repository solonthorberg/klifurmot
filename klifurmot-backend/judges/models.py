from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone
import uuid

# Create your models here.

class JudgeLink(models.Model):
    TYPE_CHOICES = [('link', 'Link'), ('invitation', 'Invitation')]
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='link')
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='judge_links_as_user',
        null=True,
        blank=True
    )
    competition = models.ForeignKey('competitions.Competition', on_delete=models.CASCADE)
    token = models.UUIDField(default=uuid.uuid4, unique=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    
    invited_email = models.EmailField(null=True, blank=True)
    invited_name = models.CharField(max_length=255, null=True, blank=True)
    
    claimed_at = models.DateTimeField(null=True, blank=True)
    claimed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='claimed_judge_links'
    )
    
    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='judge_links_created'
    )
    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'competition'],
                condition=models.Q(user__isnull=False),
                name='unique_user_competition_link'
            ),
            models.UniqueConstraint(
                fields=['invited_email', 'competition'],
                condition=models.Q(invited_email__isnull=False, claimed_at__isnull=True),
                name='unique_email_competition_invitation'
            )
        ]
