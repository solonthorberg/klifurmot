from rest_framework import serializers
from .models import Climber, CompetitionRegistration

class ClimberSerializer(serializers.ModelSerializer):
    class Meta:
        model = Climber
        fields = '__all__'

class CompetitionRegistrationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompetitionRegistration
        fields = '__all__'