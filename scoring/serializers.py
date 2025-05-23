from rest_framework import serializers

from competitions.serializers import BoulderSerializer
from .models import RoundResult, Climb, ClimberRoundScore

class RoundResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoundResult
        fields = '__all__'

class ClimbSerializer(serializers.ModelSerializer):
    boulder = BoulderSerializer()
    class Meta:
        model = Climb
        fields = '__all__'

class ClimberRoundScoreSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClimberRoundScore
        fields = '__all__'
