# competitions/serializers.py - Updated serializers

from rest_framework import serializers
from .models import Competition, CategoryGroup, CompetitionCategory, CompetitionRound, Boulder, JudgeBoulderAssignment, RoundGroup

class CompetitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Competition
        fields = '__all__'
        read_only_fields = ['created_by', 'last_modified_by', 'created_at', 'last_modified_at']

class CategoryGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoryGroup
        fields = '__all__'

class CompetitionCategorySerializer(serializers.ModelSerializer):
    category_group_detail = CategoryGroupSerializer(source='category_group', read_only=True)
    category_group = serializers.PrimaryKeyRelatedField(queryset=CategoryGroup.objects.all())
    
    class Meta:
        model = CompetitionCategory
        fields = ['id', 'competition', 'category_group', 'category_group_detail', 'gender', 
                  'created_at', 'created_by', 'last_modified_at', 'last_modified_by', 'deleted']
        read_only_fields = ['created_by', 'last_modified_by', 'created_at', 'last_modified_at']


class RoundGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoundGroup
        fields = '__all__'

class RoundSerializer(serializers.ModelSerializer):
    round_group_detail = RoundGroupSerializer(source='round_group', read_only=True)
    competition_category_detail = CompetitionCategorySerializer(source='competition_category', read_only=True)
    
    class Meta:
        model = CompetitionRound
        fields = ['id', 'competition_category', 'competition_category_detail', 'round_group', 
                  'round_group_detail', 'round_order', 'climbers_advance', 'boulder_count', 
                  'completed', 'start_date', 'end_date', 'is_default', 'created_by', 
                  'created_at', 'last_modified_at', 'last_modified_by', 'deleted']
        read_only_fields = ['created_by', 'last_modified_by', 'created_at', 'last_modified_at']
        extra_kwargs = {
            'round_group': {'write_only': True},  # Accept ID for writing
            'competition_category': {'write_only': True}  # Accept ID for writing
        }

class BoulderSerializer(serializers.ModelSerializer):
    round_detail = RoundSerializer(source='round', read_only=True)
    
    class Meta:
        model = Boulder
        fields = ['id', 'round', 'round_detail', 'section_style', 'boulder_number', 
                  'created_by', 'created_at', 'last_modified_at', 'last_modified_by', 'deleted']
        read_only_fields = ['created_by', 'last_modified_by', 'created_at', 'last_modified_at']
        extra_kwargs = {
            'round': {'write_only': True}  # Accept ID for writing
        }

class JudgeBoulderAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = JudgeBoulderAssignment
        fields = '__all__'