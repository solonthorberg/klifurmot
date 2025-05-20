from rest_framework import serializers
from accounts.serializers import UserAccountSerializer
from competitions.serializers import CompetitionCategorySerializer
from .models import Climber, CompetitionRegistration

class ClimberSerializer(serializers.ModelSerializer):
    user_account = UserAccountSerializer()

    class Meta:
        model = Climber
        fields = ['id', 'user_account']


class CompetitionRegistrationSerializer(serializers.ModelSerializer):
    climber = ClimberSerializer()
    competition_category = CompetitionCategorySerializer()
    class Meta:
        model = CompetitionRegistration
        fields = ['id', 'competition', 'competition_category', 'climber', 'created_at']