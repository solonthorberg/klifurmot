from django.utils import timezone
from django.db import models
from django.conf import settings

# Create your models here.

class Climber(models.Model):
    user_account = models.OneToOneField('accounts.UserAccount', on_delete=models.CASCADE, null=True, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at = models.DateTimeField(default=timezone.now)
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    deleted = models.BooleanField(default=False)
    
    def __str__(self):
        if self.user_account and self.user_account.full_name:
            return self.user_account.full_name
        return f"Climber {self.id}"

    
class CompetitionRegistration(models.Model):
    competition = models.ForeignKey('competitions.Competition', on_delete=models.CASCADE)
    competition_category = models.ForeignKey('competitions.CompetitionCategory', on_delete=models.CASCADE)
    climber = models.ForeignKey(Climber, on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    deleted = models.BooleanField(default=False)
    
    class Meta:
        unique_together = ('competition', 'climber', 'competition_category')

    def __str__(self):
        return f"{self.climber} in {self.competition_category}"