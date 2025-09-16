from accounts.countries import Country

countries = [
    {"code": "IS", "name_en": "Iceland", "name_local": "Ísland"},
    {"code": "US", "name_en": "United States", "name_local": "United States"},
    {"code": "FR", "name_en": "France", "name_local": "France"},
    {"code": "DE", "name_en": "Germany", "name_local": "Deutschland"},
    {"code": "NO", "name_en": "Norway", "name_local": "Norge"},
    {"code": "SE", "name_en": "Sweden", "name_local": "Sverige"},
    {"code": "ES", "name_en": "Spain", "name_local": "España"},
    {"code": "IT", "name_en": "Italy", "name_local": "Italia"},
    {"code": "JP", "name_en": "Japan", "name_local": "日本"},
    {"code": "CN", "name_en": "China", "name_local": "中国"},
    {"code": "KR", "name_en": "South Korea", "name_local": "대한민국"},
    {"code": "FI", "name_en": "Finland", "name_local": "Suomi"},
    {"code": "NL", "name_en": "Netherlands", "name_local": "Nederland"},
    {"code": "PL", "name_en": "Poland", "name_local": "Polska"},
    {"code": "BR", "name_en": "Brazil", "name_local": "Brasil"},
    {"code": "AR", "name_en": "Argentina", "name_local": "Argentina"},
    {"code": "MX", "name_en": "Mexico", "name_local": "México"},
    {"code": "IN", "name_en": "India", "name_local": "भारत"},
    {"code": "RU", "name_en": "Russia", "name_local": "Россия"},
    {"code": "GB", "name_en": "United Kingdom", "name_local": "United Kingdom"}
]

for c in countries:
    obj, created = Country.objects.update_or_create(
        country_code=c["code"],
        defaults={"name_en": c["name_en"], "name_local": c["name_local"]}
    )
    print(f"{'Created' if created else 'Updated'}: {obj}")
