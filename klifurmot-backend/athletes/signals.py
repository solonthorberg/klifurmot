from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from competitions.models import Competition
from athletes.models import CompetitionRegistration, Climber
from accounts.models import UserAccount

@receiver(post_delete, sender=Competition)
def DeleteOrphanedClimbers(sender, instance, **kwargs):
    climber_ids = CompetitionRegistration.objects.filter(
        competition=instance
    ).values_list("climber_id", flat=True)

    for climber_id in climber_ids:
        if not CompetitionRegistration.objects.filter(climber_id=climber_id).exclude(competition=instance).exists():
            Climber.objects.filter(id=climber_id).delete()


@receiver(post_save, sender=UserAccount)
def create_climber_profile(sender, instance, created, **kwargs):
    if created:
        Climber.objects.create(
            user_account=instance,
            created_by=instance.user if instance.user else None
        )