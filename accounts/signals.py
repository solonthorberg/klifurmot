from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from .models import UserAccount

@receiver(post_save, sender=User)
def create_user_account(sender, instance, created, **kwargs):
    if created and not hasattr(instance, 'profile'):
        UserAccount.objects.create(user=instance)
