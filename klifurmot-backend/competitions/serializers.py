from rest_framework import serializers

from . import models

class CreateCompetitionSerializer(serializers.ModelSerializer):
    """For creating competitions"""
    title = serializers.CharField(max_length=200, min_length=3)
    description = serializers.CharField(max_length=5000, required=False, allow_blank=True)
    location = serializers.CharField(max_length=250, required=False, allow_blank=True)
    image = serializers.ImageField(required=False, allow_null=True)
    
    class Meta:
        model = models.Competition
        fields = ['title', 'description', 'start_date', 'end_date', 'location', 'image', 'is_visible']
    
    def validate(self, data):
        if data.get('end_date') and data.get('start_date'):
            if data['end_date'] <= data['start_date']:
                raise serializers.ValidationError("End date must be after start date")
        return data

class CompetitionSerializer(serializers.ModelSerializer):
    """For listing and retrieving competitions"""
    
    class Meta:
        model = models.Competition
        fields = [
            'id',
            'title',
            'description',
            'start_date',
            'end_date',
            'location',
            'image',
            'is_visible',
            'status',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

def validate_competition_image(uploaded_file):
    """Validate competition picture file - called from view before service"""
    if uploaded_file.size > 5 * 1024 * 1024:
        raise serializers.ValidationError('Image size cannot exceed 5MB')
    
    if not uploaded_file.content_type.startswith('image/'):
        raise serializers.ValidationError('Only image files are allowed')
    
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    file_extension = uploaded_file.name.lower().split('.')[-1] if '.' in uploaded_file.name else ''
    if f'.{file_extension}' not in allowed_extensions:
        raise serializers.ValidationError('Allowed file types: JPG, PNG, GIF, WebP')
    
    return True
