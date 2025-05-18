from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth.models import User
from accounts.models import Country, UserAccount
from athletes.models import Climber, CompetitionRegistration
from competitions.models import (
    Competition, CategoryGroup, CompetitionCategory, Round, Boulder
)
from scoring.models import RoundResult, Climb, ClimberRoundScore
from faker import Faker
from random import randint, choice

fake = Faker()

class Command(BaseCommand):
    help = 'Populate sample data with many climbers, rounds, and boulders'

    def handle(self, *args, **kwargs):
        # Country
        country, _ = Country.objects.get_or_create(
            country_code='IS', defaults={"name_en": "Iceland", "name_local": "Ísland"}
        )

        # Admin user
        admin, _ = User.objects.get_or_create(username="admin")
        admin.set_password("adminpass")
        admin.is_staff = True
        admin.save()
        profile, _ = UserAccount.objects.get_or_create(user=admin, defaults={
            "is_admin": True,
            "gender": "KK",
            "date_of_birth": "1985-01-01",
            "nationality": country
        })

        # Competition
        comp = Competition.objects.create(
            title="Mega Comp",
            description="Lots of data for testing",
            start_date=timezone.now(),
            end_date=timezone.now(),
            location="Big Hall",
            created_by=admin,
            last_modified_by=admin
        )

        # Category group
        group = CategoryGroup.objects.create(name="Open", is_default=True)
        cat = CompetitionCategory.objects.create(
            competition=comp, category_group=group, gender="KK",
            created_by=admin, last_modified_by=admin
        )

        # Rounds
        rounds = []
        for i, rtype in enumerate(['qualification', 'semifinal', 'final']):
            rnd = Round.objects.create(
                competition_category=cat,
                round_type=rtype,
                round_order=i + 1,
                boulder_count=5,
                created_by=admin,
                last_modified_by=admin
            )
            rounds.append(rnd)

            # Boulders
            for b in range(1, 6):
                Boulder.objects.create(
                    round=rnd,
                    boulder_number=b,
                    section_style=choice(["power", "tech", "balance"]),
                    created_by=admin,
                    last_modified_by=admin
                )

        self.stdout.write("✅ Created competition, rounds and boulders")

        # Climbers
        climbers = []
        for i in range(50):
            climber = Climber.objects.create(
                full_name=fake.name(),
                date_of_birth=fake.date_of_birth(minimum_age=14, maximum_age=25),
                gender="KK",
                created_by=admin,
                last_modified_by=admin
            )
            CompetitionRegistration.objects.create(
                competition=comp,
                competition_category=cat,
                climber=climber,
                created_by=admin,
                last_modified_by=admin
            )
            climbers.append(climber)

        self.stdout.write(f"✅ Created {len(climbers)} climbers")

        # Round Results + Climb Scores
        for rnd in rounds:
            for i, climber in enumerate(climbers[:20]):
                RoundResult.objects.create(
                    round=rnd,
                    climber=climber,
                    start_order=i + 1,
                    created_by=admin,
                    last_modified_by=admin
                )
            boulders = Boulder.objects.filter(round=rnd)
            for climber in climbers[:20]:
                tops = zones = 0
                total_score = 0
                for b in boulders:
                    attempts_top = randint(1, 5)
                    attempts_zone = randint(1, 5)
                    top = choice([True, False])
                    zone = True if top else choice([True, False])
                    score = 25 - 0.1 * (attempts_top - 1) if top else (10 - 0.1 * (attempts_zone - 1)) if zone else 0
                    Climb.objects.create(
                        climber=climber,
                        boulder=b,
                        attempts_top=attempts_top,
                        top_reached=top,
                        attempts_zone=attempts_zone,
                        zone_reached=zone,
                        completed=top,
                        created_by=admin,
                        last_modified_by=admin
                    )
                    if top:
                        tops += 1
                    if zone:
                        zones += 1
                    total_score += score

                ClimberRoundScore.objects.create(
                    round=rnd,
                    climber=climber,
                    total_score=total_score,
                    tops=tops,
                    zones=zones
                )

        self.stdout.write("🎉 Populated climbs and scores!")
