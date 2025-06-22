from rest_framework import serializers
from competitions.serializers import BoulderSerializer
from .models import RoundResult, Climb, ClimberRoundScore

class RoundResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoundResult
        fields = [
            'id', 'round', 'climber', 'rank', 'start_order', 'start_time',
            'created_at', 'last_modified_at', 'deleted'
        ]
        read_only_fields = ['created_by', 'last_modified_by', 'created_at', 'last_modified_at']

class ClimbSerializer(serializers.ModelSerializer):
    boulder = BoulderSerializer(read_only=True)
    boulder_number = serializers.IntegerField(source='boulder.boulder_number', read_only=True)
    round_name = serializers.CharField(source='boulder.round.round_group.name', read_only=True)
   
    class Meta:
        model = Climb
        fields = [
            'id', 'climber', 'boulder', 'boulder_number', 'round_name', 'judge',
            'attempts_zone', 'zone_reached', 'attempts_top', 'top_reached',
            'completed', 'created_at', 'last_modified_at', 'deleted'
        ]
        read_only_fields = ['created_by', 'last_modified_by', 'created_at', 'last_modified_at']

class ClimberRoundScoreSerializer(serializers.ModelSerializer):
    climber_name = serializers.CharField(source='climber.user_account.full_name', read_only=True)
    round_name = serializers.CharField(source='round.round_group.name', read_only=True)
   
    class Meta:
        model = ClimberRoundScore
        fields = [
            'id', 'round', 'round_name', 'climber', 'climber_name',
            'total_score', 'tops', 'zones', 'attempts_tops', 'attempts_zones'
        ]