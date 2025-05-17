from rest_framework import serializers
from .models import Competition, CategoryGroup, CompetitionCategory, Round, Boulder, JudgeBoulderAssignment

class CompetitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Competition
        fields = '__all__'

class CategoryGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoryGroup
        fields = '__all__'

class CompetitionCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CompetitionCategory
        fields = '__all__'

class RoundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Round
        fields = '__all__'

class BoulderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Boulder
        fields = '__all__'

class JudgeBoulderAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = JudgeBoulderAssignment
        fields = '__all__'
