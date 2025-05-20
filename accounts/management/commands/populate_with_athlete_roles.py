from django.core.management.base import BaseCommand
from django.utils import timezone  # Fix the timezone import
from django.contrib.auth.models import User
from accounts.models import Country, UserAccount, CompetitionRole
from athletes.models import Climber, CompetitionRegistration
from competitions.models import Competition, CategoryGroup, CompetitionCategory, Round, Boulder
from scoring.models import RoundResult, Climb, ClimberRoundScore
from faker import Faker
from random import randint, choice

fake = Faker()

class Command(BaseCommand):
    help = 'Populate sample data with many climbers, rounds, and boulders'

    def handle(self, *args, **kwargs):
        # Create a default country (Iceland)
        country, _ = Country.objects.get_or_create(
            country_code='IS', defaults={"name_en": "Iceland", "name_local": "Ísland"}
        )

        # Create an admin user
        admin, _ = User.objects.get_or_create(username="admin")
        admin.set_password("adminpass")
        admin.is_staff = True
        admin.save()

        # Create a user account for the admin
        profile, _ = UserAccount.objects.get_or_create(user=admin, defaults={
            "is_admin": True,
            "gender": "KK",
            "date_of_birth": "1985-01-01",
            "nationality": country
        })

        # Create a competition
        comp = Competition.objects.create(
            title="Mega Comp",
            description="Multiple categories and genders",
            start_date=timezone.now(),  # Now works due to timezone import
            end_date=timezone.now(),
            location="Main Hall",
            created_by=admin,
            last_modified_by=admin
        )

        # Create categories and rounds
        group_names = ["U15", "U17", "Opinn"]
        category_structure = {}

        for group_name in group_names:
            group = CategoryGroup.objects.create(name=group_name)
            category_structure[group_name] = {}
            for gender in ["KK", "KVK"]:
                cat = CompetitionCategory.objects.create(
                    competition=comp,
                    category_group=group,
                    gender=gender,
                    created_by=admin,
                    last_modified_by=admin
                )
                category_structure[group_name][gender] = cat

        # Create rounds and boulders for each category
        rounds_by_category = {}  # Fix: Define rounds_by_category

        for group in group_names:
            for gender in ["KK", "KVK"]:
                cat = category_structure[group][gender]
                rounds = []
                for i, rtype in enumerate(["qualification", "semifinal", "final"]):
                    rnd = Round.objects.create(
                        competition_category=cat,
                        round_type=rtype,
                        round_order=i + 1,
                        boulder_count=5,
                        created_by=admin,
                        last_modified_by=admin
                    )
                    rounds.append(rnd)
                    for b in range(1, 6):
                        Boulder.objects.create(
                            round=rnd,
                            boulder_number=b,
                            section_style=choice(["power", "tech", "balance"]),
                            created_by=admin,
                            last_modified_by=admin
                        )
                rounds_by_category[(group, gender)] = rounds  # Fix: Add rounds to the dictionary

        self.stdout.write("✅ Created categories, rounds, and boulders")

        climbers_by_category = {key: [] for key in rounds_by_category.keys()}

        for i in range(60):
            gender = choice(["KK", "KVK"])
            group = choice(group_names)
            first_name = fake.first_name()
            last_name = fake.last_name()
            username = f"climber{i}"

            # Create a new User for each climber
            user, created = User.objects.get_or_create(username=username, defaults={
                "email": f"{username}@example.com",
                "first_name": first_name,
                "last_name": last_name
            })
            if created:
                user.set_password("pass1234")
                user.save()

            # Create a UserAccount for the climber and set the gender, nationality, etc.
            user_account, _ = UserAccount.objects.get_or_create(user=user)
            user_account.gender = gender
            user_account.date_of_birth = fake.date_of_birth(minimum_age=13, maximum_age=25)
            user_account.nationality = country
            user_account.save()

            # Create the Climber and assign it to the UserAccount and the User
            climber = Climber.objects.create(
                full_name=f"{first_name} {last_name}",
                gender=gender,
                date_of_birth=user_account.date_of_birth,
                user_account=user_account,  # Link Climber to the UserAccount
                user=user,  # Link Climber directly to the User
                created_by=admin,
                last_modified_by=admin
            )

            # Register the climber in the competition category
            category = category_structure[group][gender]
            CompetitionRegistration.objects.create(
                competition=comp,
                competition_category=category,
                climber=climber,
                created_by=admin,
                last_modified_by=admin
            )

            # Assign role to the user for the competition
            CompetitionRole.objects.create(
                user=user_account,
                competition=comp,
                role="athlete",
                created_by=profile,
                last_modified_by=profile
            )

            climbers_by_category[(group, gender)].append(climber)

        self.stdout.write(f"✅ Created {sum(len(lst) for lst in climbers_by_category.values())} climbers")

        # Create results for each climber in rounds
        for (group, gender), climber_list in climbers_by_category.items():
            for rnd in rounds_by_category[(group, gender)]:
                for i, climber in enumerate(climber_list[:20]):
                    RoundResult.objects.create(
                        round=rnd,
                        climber=climber,
                        start_order=i + 1,
                        created_by=admin,
                        last_modified_by=admin
                    )

                boulders = Boulder.objects.filter(round=rnd)
                for climber in climber_list[:20]:
                    tops = zones = total_score = 0
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
                        if top: tops += 1
                        if zone: zones += 1
                        total_score += score

                    ClimberRoundScore.objects.create(
                        round=rnd,
                        climber=climber,
                        total_score=total_score,
                        tops=tops,
                        zones=zones
                    )

        self.stdout.write("🎉 Finished populating climbs and scores!")
