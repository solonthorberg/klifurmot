from rest_framework import serializers

from . import models


def validate_competition_image(uploaded_file):
    if uploaded_file.size > 5 * 1024 * 1024:
        raise serializers.ValidationError("Image size cannot exceed 5MB")

    if not uploaded_file.content_type.startswith("image/"):
        raise serializers.ValidationError("Only image files are allowed")

    allowed_extensions = ["jpg", "jpeg", "png", "webp", "gif"]
    file_extension = (
        uploaded_file.name.lower().split(".")[-1] if "." in uploaded_file.name else ""
    )

    if file_extension not in allowed_extensions:
        raise serializers.ValidationError("Allowed file types: JPG, PNG, GIF, WebP")

    return True


class CreateCompetitionSerializer(serializers.ModelSerializer):
    """Serializer for creating competitions"""

    title = serializers.CharField(max_length=200, min_length=3)
    description = serializers.CharField(
        max_length=5000, required=False, allow_blank=True
    )
    location = serializers.CharField(max_length=250, required=False, allow_blank=True)
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = models.Competition
        fields = [
            "title",
            "description",
            "start_date",
            "end_date",
            "location",
            "image",
            "visible",
        ]

    def validate_image(self, value):
        if value is None:
            return value
        validate_competition_image(value)
        return value

    def validate(self, data):
        if data.get("end_date") and data.get("start_date"):
            if data["end_date"] <= data["start_date"]:
                raise serializers.ValidationError("End date must be after start date")
        return data


class UpdateCompetitionSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=200, min_length=3, required=False)
    description = serializers.CharField(
        max_length=5000, required=False, allow_blank=True
    )
    start_date = serializers.DateTimeField(required=False)
    end_date = serializers.DateTimeField(required=False)
    location = serializers.CharField(max_length=250, required=False, allow_blank=True)
    image = serializers.ImageField(required=False, allow_null=True)
    visible = serializers.BooleanField(required=False)
    remove_image = serializers.BooleanField(required=False, default=False)

    def validate_image(self, value):
        if value is None:
            return value
        validate_competition_image(value)
        return value

    def validate(self, data):
        if data.get("end_date") and data.get("start_date"):
            if data["end_date"] <= data["start_date"]:
                raise serializers.ValidationError("End date must be after start date")

        if data.get("remove_image") and data.get("image"):
            raise serializers.ValidationError(
                "Cannot remove image and upload new image simultaneously"
            )

        return data


class CompetitionSerializer(serializers.ModelSerializer):
    """For listing and retrieving competitions"""

    class Meta:
        model = models.Competition
        fields = [
            "id",
            "title",
            "description",
            "start_date",
            "end_date",
            "location",
            "image",
            "visible",
            "status",
            "created_at",
            "last_modified_at",
        ]
        read_only_fields = ["id", "created_at", "last_modified_at"]


class RoundSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.CompetitionRound
        fields = [
            "id",
            "competition_category",
            "round_group",
            "round_order",
            "climbers_advance",
            "boulder_count",
            "start_date",
            "end_date",
            "is_self_scoring",
            "completed",
        ]


class CreateRoundSerializer(serializers.Serializer):
    competition_category = serializers.IntegerField()
    round_group = serializers.IntegerField()
    round_order = serializers.IntegerField(min_value=1)
    climbers_advance = serializers.IntegerField(min_value=0, default=0)
    boulder_count = serializers.IntegerField(min_value=0, default=0)
    start_date = serializers.DateTimeField(required=False, allow_null=True)
    end_date = serializers.DateTimeField(required=False, allow_null=True)
    is_self_scoring = serializers.BooleanField(default=False)

    def validate(self, data):
        if data.get("end_date") and data.get("start_date"):
            if data["end_date"] <= data["start_date"]:
                raise serializers.ValidationError("End date must be after start date")
        return data


class UpdateRoundSerializer(serializers.Serializer):
    round_group = serializers.IntegerField(required=False)
    round_order = serializers.IntegerField(min_value=1, required=False)
    climbers_advance = serializers.IntegerField(min_value=0, required=False)
    boulder_count = serializers.IntegerField(min_value=0, required=False)
    start_date = serializers.DateTimeField(required=False, allow_null=True)
    end_date = serializers.DateTimeField(required=False, allow_null=True)
    is_self_scoring = serializers.BooleanField(required=False)

    def validate(self, data):
        if data.get("end_date") and data.get("start_date"):
            if data["end_date"] <= data["start_date"]:
                raise serializers.ValidationError("End date must be after start date")
        return data


class UpdateRoundStatusSerializer(serializers.Serializer):
    completed = serializers.BooleanField()


class RoundGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.RoundGroup
        fields = ["id", "name", "is_default"]


class CreateCompetitionCategorySerializer(serializers.Serializer):
    competition = serializers.IntegerField()
    category_group = serializers.IntegerField()
    gender = serializers.ChoiceField(choices=["KK", "KVK"])


class CategoryGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.CategoryGroup
        fields = ["id", "name", "min_age", "max_age"]


class CompetitionCategorySerializer(serializers.ModelSerializer):
    category_group_detail = CategoryGroupSerializer(
        source="category_group", read_only=True
    )

    class Meta:
        model = models.CompetitionCategory
        fields = [
            "id",
            "competition",
            "category_group",
            "category_group_detail",
            "gender",
        ]


class UpdateCompetitionCategorySerializer(serializers.Serializer):
    category_group = serializers.IntegerField(required=False)
    gender = serializers.ChoiceField(choices=["KK", "KVK"], required=False)


class BoulderSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Boulder
        fields = [
            "id",
            "round",
            "boulder_number",
            "section_style",
        ]
