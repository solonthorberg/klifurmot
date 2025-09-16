#!/usr/bin/env python3
import os
import sys
import django

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
sys.path.append(project_root)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'klifurmot.settings')

django.setup()

from accounts.models import Country

countries = [
    {"code": "IS", "name_en": "Iceland", "name_local": "Ísland"},
    {"code": "US", "name_en": "United States", "name_local": "United States"},
    {"code": "FR", "name_en": "France", "name_local": "France"},
    {"code": "DE", "name_en": "Germany", "name_local": "Deutschland"},
    {"code": "NO", "name_en": "Norway", "name_local": "Norge"},
    {"code": "SE", "name_en": "Sweden", "name_local": "Sverige"},
    {"code": "ES", "name_en": "Spain", "name_local": "España"},
    {"code": "IT", "name_en": "Italy", "name_local": "Italia"},
    {"code": "FI", "name_en": "Finland", "name_local": "Suomi"},
    {"code": "NL", "name_en": "Netherlands", "name_local": "Nederland"},
    {"code": "GB", "name_en": "United Kingdom", "name_local": "United Kingdom"}
]

def main():
    print("Loading countries into database...")
    
    for c in countries:
        obj, created = Country.objects.update_or_create(
            country_code=c["code"],
            defaults={"name_en": c["name_en"], "name_local": c["name_local"]}
        )
        print(f"{'Created' if created else 'Updated'}: {obj}")
    
    print(f"\nSuccessfully processed {len(countries)} countries!")

if __name__ == "__main__":
    main()
