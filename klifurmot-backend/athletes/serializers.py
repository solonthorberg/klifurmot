from rest_framework import serializers


class CreateClimberSerializer(serializers.Serializer):
    is_simple_athlete = serializers.BooleanField(default=True)
    name = serializers.CharField(max_length=250, required=False)
    age = serializers.IntegerField(min_value=1, max_value=100, required=False)
    gender = serializers.ChoiceField(choices=["KK", "KVK"], required=False)
    user_account_id = serializers.IntegerField(required=False)

    def validate(self, data):
        if data.get("is_simple_athlete"):
            if not data.get("name"):
                raise serializers.ValidationError(
                    "name is required for simple athletes"
                )
            if not data.get("age"):
                raise serializers.ValidationError("age is required for simple athletes")
            if not data.get("gender"):
                raise serializers.ValidationError(
                    "gender is required for simple athletes"
                )
        else:
            if not data.get("user_account_id"):
                raise serializers.ValidationError(
                    "user_account_id is required for regular athletes"
                )
        return data


class UpdateClimberSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=250, required=False)
    age = serializers.IntegerField(min_value=1, max_value=100, required=False)
    gender = serializers.ChoiceField(choices=["KK", "KVK"], required=False)


class CreateRegistrationSerializer(serializers.Serializer):
    climber = serializers.IntegerField()
    competition = serializers.IntegerField()
    competition_category = serializers.IntegerField()
