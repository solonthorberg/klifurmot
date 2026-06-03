from rest_framework import serializers
from django.utils import timezone

from . import models


def validate_image(uploaded_file):
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

    title = serializers.CharField(max_length=50, min_length=2)
    description = serializers.CharField(max_length=3000, min_length=2)
    start_date = serializers.DateTimeField()
    end_date = serializers.DateTimeField()
    location = serializers.CharField(max_length=50, min_length=2)
    image = serializers.ImageField(required=False, allow_null=True)
    visible = serializers.BooleanField(required=False, default=True)
    discipline = serializers.ChoiceField(
        choices=["boulder", "lead"],
        required=False,
        default="boulder",
    )

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
            "discipline",
        ]

    def validate_image(self, value):
        if value is None:
            return value
        validate_image(value)
        return value

    def validate_start_date(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("Start date cannot be in the past")
        return value

    def validate_end_date(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("End date cannot be in the past")
        return value

    def validate(self, data):
        if data.get("end_date") and data.get("start_date"):
            if data["end_date"] <= data["start_date"]:
                raise serializers.ValidationError("End date must be after start date")
        return data


class UpdateCompetitionSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=50, min_length=2, required=False)
    description = serializers.CharField(max_length=3000, min_length=2, required=False)
    start_date = serializers.DateTimeField(required=False)
    end_date = serializers.DateTimeField(required=False)
    location = serializers.CharField(max_length=50, min_length=2, required=False)
    image = serializers.ImageField(required=False, allow_null=True)
    visible = serializers.BooleanField(required=False)
    remove_image = serializers.BooleanField(required=False, default=False)

    def validate_image(self, value):
        if value is None:
            return value
        validate_image(value)
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
    created_by = serializers.CharField(source="created_by.username", read_only=True)

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
            "discipline",
            "status",
            "created_at",
            "created_by",
            "last_modified_at",
        ]
        read_only_fields = ["id", "created_at", "created_by", "last_modified_at"]


class RoundSerializer(serializers.ModelSerializer):
    category_group_name = serializers.CharField(
        source="competition_category.category_group.name", read_only=True
    )

    gender = serializers.CharField(source="competition_category.gender", read_only=True)
    round_group_name = serializers.CharField(source="round_group.name", read_only=True)

    class Meta:
        model = models.CompetitionRound
        fields = [
            "id",
            "competition_category",
            "category_group_name",
            "gender",
            "round_group",
            "round_group_name",
            "round_order",
            "climbers_advance",
            "route_count",
            "start_date",
            "end_date",
            "is_self_scoring",
            "completed",
            "status",
        ]


class CreateRoundSerializer(serializers.Serializer):
    round_group = serializers.IntegerField()
    round_order = serializers.IntegerField(min_value=1)
    climbers_advance = serializers.IntegerField(
        min_value=0, max_value=200, default=0, allow_null=True
    )
    route_count = serializers.IntegerField(min_value=1, max_value=100, default=1)
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
    climbers_advance = serializers.IntegerField(
        min_value=0, max_value=200, required=False, allow_null=True
    )
    route_count = serializers.IntegerField(min_value=1, max_value=100, required=False)
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
    category_group = serializers.IntegerField()
    gender = serializers.ChoiceField(choices=["KK", "KVK"])


class CategoryGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.CategoryGroup
        fields = ["id", "name", "min_age", "max_age", "is_default"]


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


class RouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = models.Route
        fields = [
            "id",
            "round",
            "route_number",
            "section_style",
        ]


class UpdateRouteSerializer(serializers.Serializer):
    image = serializers.ImageField(required=False, allow_null=True)
    section_style = serializers.CharField(max_length=50, required=False)

    def validate_image(self, value):
        if value is None:
            return value
        validate_image(value)
        return value
