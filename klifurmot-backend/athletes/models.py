from django.utils import timezone
from django.db import models
from django.conf import settings

# Create your models here.

class Climber(models.Model):
    GENDER_CHOICES = [('KK', 'KK'), ('KVK', 'KVK')]
    user_account = models.OneToOneField('accounts.UserAccount', on_delete=models.CASCADE, null=True, blank=True)
    
    simple_name = models.CharField(max_length=100, blank=True, null=True)
    simple_age = models.IntegerField(blank=True, null=True)
    simple_gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, null=True)
    is_simple_athlete = models.BooleanField(default=False)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at = models.DateTimeField(default=timezone.now)
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='+')
    deleted = models.BooleanField(default=False)
    
    def __str__(self):
        if self.is_simple_athlete and self.simple_name:
            return self.simple_name
        elif self.user_account and self.user_account.full_name:
            return self.user_account.full_name
        return f"Climber {self.id}"

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
            from datetime import date
            birth_date = self.user_account.date_of_birth
            today = date.today()
            return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
        return None

    
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