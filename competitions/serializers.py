from rest_framework import serializers
from .models import Competition, CategoryGroup, CompetitionCategory, CompetitionRound, Boulder, JudgeBoulderAssignment, RoundGroup

class CompetitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Competition
        fields = '__all__'

class CategoryGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = CategoryGroup
        fields = '__all__'

class CompetitionCategorySerializer(serializers.ModelSerializer):
    category_group = CategoryGroupSerializer()
    class Meta:
        model = CompetitionCategory
        fields = '__all__'

class RoundGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoundGroup
        fields = '__all__'

class RoundSerializer(serializers.ModelSerializer):
    round_group = RoundGroupSerializer()
    competition_category = CompetitionCategorySerializer()
    class Meta:
        model = CompetitionRound
        fields = '__all__'


class BoulderSerializer(serializers.ModelSerializer):
    round = RoundSerializer()
    class Meta:
        model = Boulder
        fields = '__all__'

class JudgeBoulderAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = JudgeBoulderAssignment
        fields = '__all__'
