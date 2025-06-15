# competitions/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import CompetitionRound, Boulder

@receiver(post_save, sender=CompetitionRound)
def create_boulders_for_round(sender, instance, created, **kwargs):
    """
    Automatically create boulders when a new round is created
    """
    if created and instance.boulder_count > 0:
        print(f"🧗 Creating {instance.boulder_count} boulders for round {instance}")
        
        # Create boulders for this round
        boulders_to_create = []
        for i in range(1, instance.boulder_count + 1):
            boulder = Boulder(
                round=instance,
                boulder_number=i,
                section_style='general',  # Simple default value
                created_by=instance.created_by,
                last_modified_by=instance.last_modified_by
            )
            boulders_to_create.append(boulder)
        
        # Bulk create for efficiency
        Boulder.objects.bulk_create(boulders_to_create)
        print(f"✅ Created {len(boulders_to_create)} boulders for round {instance}")

@receiver(post_save, sender=CompetitionRound)
def update_boulders_on_count_change(sender, instance, created, **kwargs):
    """
    Update boulders when boulder_count changes on existing rounds
    """
    if not created:  # Only for updates, not new creations
        current_boulder_count = instance.boulder_set.count()
        target_boulder_count = instance.boulder_count
        
        if current_boulder_count != target_boulder_count:
            print(f"🔄 Updating boulders: {current_boulder_count} → {target_boulder_count}")
            
            if target_boulder_count > current_boulder_count:
                # Add new boulders
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
                print(f"➕ Added {len(boulders_to_create)} boulders")
                
            elif target_boulder_count < current_boulder_count:
                # Remove excess boulders (from the end)
                Boulder.objects.filter(
                    round=instance,
                    boulder_number__gt=target_boulder_count
                ).delete()
                print(f"➖ Removed {current_boulder_count - target_boulder_count} boulders")