from rest_framework import serializers
from .models import Country, UserAccount, CompetitionRole, JudgeLink, User

class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = '__all__'

class UserAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAccount
        fields = '__all__'


class JudgeLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = JudgeLink
        fields = '__all__'

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class CompetitionRoleSerializer(serializers.ModelSerializer):
    competition_title = serializers.CharField(source='competition.title', read_only=True)
    user_name = serializers.CharField(source='user.user.username', read_only=True)

    class Meta:
        model = CompetitionRole
        fields = ['id', 'user', 'user_name', 'competition', 'competition_title', 'role']

class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ['country_code', 'name_en', 'name_local']