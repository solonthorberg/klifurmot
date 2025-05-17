from django.core.management.base import BaseCommand
from accounts.models import Country

class Command(BaseCommand):
    help = 'Loads default country codes into the Country model.'

    def handle(self, *args, **kwargs):
        countries = [
            ("IS", "Iceland", "Ísland"),
            ("US", "United States", "United States"),
            ("NO", "Norway", "Norge"),
            ("SE", "Sweden", "Sverige"),
            ("DK", "Denmark", "Danmark"),
            ("FI", "Finland", "Suomi"),
        ]

        for code, name_en, name_local in countries:
            country, created = Country.objects.get_or_create(
                country_code=code,
                defaults={"name_en": name_en, "name_local": name_local}
            )
            if created:
                self.stdout.write(self.style.SUCCESS(f"Added {name_en} ({code})"))
            else:
                self.stdout.write(f"Skipped {name_en} ({code}) - already exists")
