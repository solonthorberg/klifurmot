# competitions/signals.py
from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from .models import CompetitionRound, Boulder, Competition

@receiver(post_save, sender=CompetitionRound)
def CreateBouldersForRound(sender, instance, created, **kwargs):
    if created and instance.boulder_count > 0:        
        boulders_to_create = []
        for i in range(1, instance.boulder_count + 1):
            boulder = Boulder(
                round=instance,
                boulder_number=i,
                section_style='general',
                created_by=instance.created_by,
                last_modified_by=instance.last_modified_by
            )
            boulders_to_create.append(boulder)
        
        Boulder.objects.bulk_create(boulders_to_create)

@receiver(post_save, sender=CompetitionRound)
def UpdateBouldersOnCountChange(sender, instance, created, **kwargs):
    if not created:
        current_boulder_count = instance.boulder_set.count()
        target_boulder_count = instance.boulder_count
        
        if current_boulder_count != target_boulder_count:
            
            if target_boulder_count > current_boulder_count:
                boulders_to_create = []
                for i in range(current_boulder_count + 1, target_boulder_count + 1):
                    boulder = Boulder(
                        round=instance,
                        boulder_number=i,
                        section_style='general',
                        created_by=instance.last_modified_by,
                        last_modified_by=instance.last_modified_by
                    )
                    boulders_to_create.append(boulder)
                
                Boulder.objects.bulk_create(boulders_to_create)
                
            elif target_boulder_count < current_boulder_count:
                Boulder.objects.filter(
                    round=instance,
                    boulder_number__gt=target_boulder_count
                ).delete()

@receiver(pre_save, sender=Competition)
def delete_old_competition_image_on_update(sender, instance, **kwargs):
    if not instance.pk:
        return

    try:
        old_instance = Competition.objects.get(pk=instance.pk)
        old_image = old_instance.image
        new_image = instance.image

        if old_image and old_image != new_image:
            try:
                old_image.delete(save=False)
                print(f"Deleted old competition image: {old_image.name}")
            except Exception as delete_error:
                print(f"Error deleting old competition image: {delete_error}")
                
    except Competition.DoesNotExist:
        pass
    except Exception as e:
        print(f"Error in delete_old_competition_image_on_update: {e}")

@receiver(post_delete, sender=Competition)
def delete_competition_image_on_delete(sender, instance, **kwargs):
    if instance.image:
        try:
            instance.image.delete(save=False)
            print(f"Deleted competition image on delete: {instance.image.name}")
        except Exception as e:
            print(f"Error deleting competition image on delete: {e}")              