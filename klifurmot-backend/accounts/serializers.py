from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from datetime import date
import re

from .models import UserAccount, Country, JudgeLink, CompetitionRole 

class LoginSerializer(serializers.Serializer):
    """Serializer for login"""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate_email(self, value):
        value = value.strip().lower()

        if not value:
            raise serializers.ValidationError('Email cannot be empty')
        
        return value

    def validate_password(self, value):
        if not value:
            raise serializers.ValidationError('Password cannot be empty')

        return value


class RegisterSerializer(serializers.Serializer):
    """Serializer for registering new account"""
    
    # Required
    full_name = serializers.CharField(min_length=3, max_length=100, required=True)
    username = serializers.CharField(min_length=3, max_length=150, required=True)
    email = serializers.EmailField(max_length=254, required=True)
    password = serializers.CharField(min_length=8, max_length=128, write_only=True, required=True)
    password2 = serializers.CharField(min_length=8, max_length=128, write_only=True, required=True)
    gender = serializers.ChoiceField(choices=['KK', 'KVK'], required=True)
    date_of_birth = serializers.DateField(required=True)
    nationality = serializers.CharField(min_length=2, max_length=2, required=True)
    
    # Optional
    height_cm = serializers.IntegerField(min_value=50, max_value=300, required=False, allow_null=True)
    wingspan_cm = serializers.IntegerField(min_value=50, max_value=400, required=False, allow_null=True)
    
    def validate_full_name(self, value):
        value = value.strip()
        
        if not value:
            raise serializers.ValidationError('Full name cannot be empty')
        
        return value
    
    def validate_username(self, value):
        value = value.strip()
        
        if not value:
            raise serializers.ValidationError('Username cannot be empty')
        
        if not re.match(r'^[\w.@+-]+$', value):
            raise serializers.ValidationError(
                'Username can only contain letters, numbers, and @/./+/-/_'
            )
        
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('Username already exists')
        
        return value
    
    def validate_email(self, value):
        value = value.strip().lower()
        
        if not value:
            raise serializers.ValidationError('Email cannot be empty')
        
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Email already in use')
        
        return value
    
    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        
        return value
    
    def validate_date_of_birth(self, value):
        if not value:
            raise serializers.ValidationError('Date of birth cannot be empty')

        if value > date.today():
            raise serializers.ValidationError('Date of birth cannot be in the future')
        
        return value
    
    def validate_nationality(self, value):
        value = value.strip().upper()
        
        if not value:
            raise serializers.ValidationError('Nationality cannot be empty')
        
        if len(value) != 2:
            raise serializers.ValidationError('Nationality must be exactly 2 characters')
        
        if not Country.objects.filter(country_code=value).exists():
            raise serializers.ValidationError('Invalid nationality code')
        
        return value
    
    def validate_gender(self, value):
        value = value.strip().upper()
        
        if not value:
            raise serializers.ValidationError('Gender cannot be empty')
        
        return value
    
    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({
                'password2': 'Passwords do not match'
            })
        
        data.pop('password2')
        return data

class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ['country_code', 'name_en', 'name_local']

class UserAccountSerializer(serializers.ModelSerializer):
    nationality = CountrySerializer()  # Nested serializer
    class Meta:
        model = UserAccount
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
