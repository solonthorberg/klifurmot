from django.db import models

# Create your models here.

class Climber(models.Model):
    GENDER_CHOICES = [('KK', 'Male'), ('KVK', 'Female')]

    full_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    user = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, blank=True)
    created_by = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, related_name='+')
    created_at = models.DateTimeField(default=timezone.now)
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, related_name='+')
    deleted = models.BooleanField(default=False)

class CompetitionRegistration(models.Model):
    competition = models.ForeignKey(Competition, on_delete=models.CASCADE)
    competition_category = models.ForeignKey(CompetitionCategory, on_delete=models.CASCADE)
    climber = models.ForeignKey(Climber, on_delete=models.CASCADE)
    created_at = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, related_name='+')
    last_modified_at = models.DateTimeField(default=timezone.now)
    last_modified_by = models.ForeignKey(UserAccount, on_delete=models.SET_NULL, null=True, related_name='+')
    deleted = models.BooleanField(default=False)

    class Meta:
        unique_together = ('competition', 'climber', 'competition_category')