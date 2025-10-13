from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from datetime import date
import re

from . import models

class UserProfileResponseSerializer(serializers.ModelSerializer):
    """Serializer for response for /me"""
    nationality = serializers.CharField(source='nationality.country_code', allow_null=True)
    profile_picture = serializers.SerializerMethodField()
    
    class Meta:
        model = models.UserAccount
        fields = ['full_name', 'gender', 'date_of_birth', 'nationality', 
                  'height_cm', 'wingspan_cm', 'profile_picture', 'is_admin']
    
    def get_profile_picture(self, obj):
        return obj.profile_picture.url if obj.profile_picture else None

class UserResponseSerializer(serializers.Serializer):
    """Serializer for response of updating a profile"""
    token = serializers.CharField()
    user = serializers.SerializerMethodField()
    profile = UserProfileResponseSerializer(source='user_account')
    
    def get_user(self, obj):
        return {
            'id': obj['user'].id,
            'username': obj['user'].username,
            'email': obj['user'].email,
        }

class UpdateProfileSerializer(serializers.Serializer):
    """Serializer for updating a profile"""
    full_name = serializers.CharField(min_length=3, max_length=100, required=False)
    gender = serializers.ChoiceField(choices=['KK', 'KVK'], required=False)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    nationality = serializers.CharField(min_length=2, max_length=2, required=False)
    height_cm = serializers.IntegerField(min_value=50, max_value=300, required=False, allow_null=True)
    wingspan_cm = serializers.IntegerField(min_value=50, max_value=400, required=False, allow_null=True)

    def validate_full_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Full name cannot be empty')
        return value

    def validate_nationality(self, value):
        value = value.strip().upper()
        if not Country.objects.filter(country_code=value).exists():
            raise serializers.ValidationError('Invalid nationality code')
        return value

    def validate_date_of_birth(self, value):
        if value and value > date.today():
            raise serializers.ValidationError('Date of birth cannot be in the future')
        return value

def validate_profile_picture(uploaded_file):
    """Validate profile picture file - called from view before service"""
    if uploaded_file.size > 5 * 1024 * 1024:
        raise serializers.ValidationError('Image size cannot exceed 5MB')
    
    if not uploaded_file.content_type.startswith('image/'):
        raise serializers.ValidationError('Only image files are allowed')
    
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    file_extension = uploaded_file.name.lower().split('.')[-1] if '.' in uploaded_file.name else ''
    if f'.{file_extension}' not in allowed_extensions:
        raise serializers.ValidationError('Allowed file types: JPG, PNG, GIF, WebP')
    
    return True

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

class GoogleLoginSerializer(serializers.Serializer):
    """Serializer for Google OAuth login"""
    token = serializers.CharField(required=True)
    
    def validate_token(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Token cannot be empty')
        return value.strip()

class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Country
        fields = ['country_code', 'name_en', 'name_local']

class UserAccountSerializer(serializers.ModelSerializer):
    nationality = CountrySerializer()
    class Meta:
        model = models.UserAccount
        fields = '__all__'

class CompetitionRoleSerializer(serializers.ModelSerializer):
    competition_title = serializers.CharField(source='competition.title', read_only=True)
    user_name = serializers.CharField(source='user.user.username', read_only=True)

    class Meta:
        model = models.CompetitionRole
        fields = ['id', 'user', 'user_name', 'competition', 'competition_title', 'role']
