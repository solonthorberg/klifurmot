#!/usr/bin/env python3
"""
Seed script to populate countries in the database.
Usage:
    cd klifurmot-backend
    python scripts/seed_countries.py
"""

import os
import sys

import django
from accounts.models import Country

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
sys.path.append(project_root)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "klifurmot.settings")
django.setup()


countries = [
    {"code": "IS", "name_en": "Iceland", "name_local": "Ísland"},
    {"code": "US", "name_en": "United States", "name_local": "United States"},
    {"code": "GB", "name_en": "United Kingdom", "name_local": "United Kingdom"},
    {"code": "DE", "name_en": "Germany", "name_local": "Deutschland"},
    {"code": "FR", "name_en": "France", "name_local": "France"},
    {"code": "IT", "name_en": "Italy", "name_local": "Italia"},
    {"code": "ES", "name_en": "Spain", "name_local": "España"},
    {"code": "PT", "name_en": "Portugal", "name_local": "Portugal"},
    {"code": "NL", "name_en": "Netherlands", "name_local": "Nederland"},
    {"code": "BE", "name_en": "Belgium", "name_local": "België"},
    {"code": "SE", "name_en": "Sweden", "name_local": "Sverige"},
    {"code": "NO", "name_en": "Norway", "name_local": "Norge"},
    {"code": "DK", "name_en": "Denmark", "name_local": "Danmark"},
    {"code": "FI", "name_en": "Finland", "name_local": "Suomi"},
    {"code": "CH", "name_en": "Switzerland", "name_local": "Schweiz"},
    {"code": "AT", "name_en": "Austria", "name_local": "Österreich"},
    {"code": "PL", "name_en": "Poland", "name_local": "Polska"},
    {"code": "CZ", "name_en": "Czech Republic", "name_local": "Česká republika"},
    {"code": "SK", "name_en": "Slovakia", "name_local": "Slovensko"},
    {"code": "HU", "name_en": "Hungary", "name_local": "Magyarország"},
    {"code": "RO", "name_en": "Romania", "name_local": "România"},
    {"code": "GR", "name_en": "Greece", "name_local": "Ελλάδα"},
    {"code": "HR", "name_en": "Croatia", "name_local": "Hrvatska"},
    {"code": "SI", "name_en": "Slovenia", "name_local": "Slovenija"},
    {"code": "UA", "name_en": "Ukraine", "name_local": "Україна"},
    {"code": "CN", "name_en": "China", "name_local": "中国"},
    {"code": "JP", "name_en": "Japan", "name_local": "日本"},
    {"code": "KR", "name_en": "South Korea", "name_local": "대한민국"},
    {"code": "IN", "name_en": "India", "name_local": "भारत"},
    {"code": "AU", "name_en": "Australia", "name_local": "Australia"},
    {"code": "NZ", "name_en": "New Zealand", "name_local": "New Zealand"},
    {"code": "CA", "name_en": "Canada", "name_local": "Canada"},
    {"code": "MX", "name_en": "Mexico", "name_local": "México"},
    {"code": "BR", "name_en": "Brazil", "name_local": "Brasil"},
    {"code": "AR", "name_en": "Argentina", "name_local": "Argentina"},
    {"code": "CL", "name_en": "Chile", "name_local": "Chile"},
    {"code": "CO", "name_en": "Colombia", "name_local": "Colombia"},
    {"code": "ZA", "name_en": "South Africa", "name_local": "South Africa"},
    {"code": "NG", "name_en": "Nigeria", "name_local": "Nigeria"},
    {"code": "KE", "name_en": "Kenya", "name_local": "Kenya"},
    {"code": "TR", "name_en": "Turkey", "name_local": "Türkiye"},
]


def main():
    print("Loading countries into database...")
    for c in countries:
        obj, created = Country.objects.update_or_create(
            country_code=c["code"],
            defaults={"name_en": c["name_en"], "name_local": c["name_local"]},
        )
        print(f"{'Created' if created else 'Updated'}: {obj}")
    print(f"\nSuccessfully processed {len(countries)} countries!")


if __name__ == "__main__":
    main()
