from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token
from .models import UserAccount

@receiver(post_save, sender=User)
def CreateUserAccount(sender, instance, created, **kwargs):
    if created and not hasattr(instance, 'profile'):
        UserAccount.objects.create(user=instance)
    Token.objects.get_or_create(user=instance)
