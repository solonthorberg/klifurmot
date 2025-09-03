from rest_framework import serializers
from accounts.serializers import UserAccountSerializer
from competitions.serializers import CompetitionCategorySerializer
from .models import Climber, CompetitionRegistration

class ClimberSerializer(serializers.ModelSerializer):
    user_account = UserAccountSerializer(read_only=True)
    
    class Meta:
        model = Climber
        fields = [
            'id', 'user_account', 'is_simple_athlete', 
            'simple_name', 'simple_age', 'simple_gender',
            'created_by', 'created_at', 'last_modified_at', 
            'last_modified_by', 'deleted'
        ]
        read_only_fields = ['created_by', 'last_modified_by', 'created_at', 'last_modified_at']

    def to_representation(self, instance):
        """Custom representation to handle both simple and regular athletes"""
        data = super().to_representation(instance)
        
        if instance.is_simple_athlete:
            # For simple athletes, don't include user_account data
            data['user_account'] = None
        else:
            # For regular athletes, don't include simple athlete fields
            data.pop('simple_name', None)
            data.pop('simple_age', None) 
            data.pop('simple_gender', None)
            
        return data

class CompetitionRegistrationSerializer(serializers.ModelSerializer):
    climber = ClimberSerializer()
    competition_category = CompetitionCategorySerializer()
    class Meta:
        model = CompetitionRegistration
        fields = ['id', 'competition', 'competition_category', 'climber', 'created_at']