from django.conf import settings
from django.db import models
from django.utils import timezone


class UserGender(models.TextChoices):
    KK = "KK", "Karlkyn"
    KVK = "KVK", "Kvenkyn"
    OTHER = "OTHER", "Annað"


class CompetitionGender(models.TextChoices):
    KK = "KK", "KK"
    KVK = "KVK", "KVK"


class AuditedSoftDeleteModel(models.Model):
    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="+",
    )
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="+",
    )
    deleted = models.BooleanField(default=False, db_index=True)

    class Meta:
        abstract = True
