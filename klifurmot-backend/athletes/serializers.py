from rest_framework import serializers


class CreateClimberSerializer(serializers.Serializer):
    is_simple_athlete = serializers.BooleanField(default=True)
    name = serializers.CharField(max_length=30, required=False)
    age = serializers.IntegerField(min_value=1, max_value=99, required=False)
    gender = serializers.ChoiceField(choices=["KK", "KVK"], required=False)
    user_account_id = serializers.IntegerField(required=False)

    def validate(self, data):
        if data.get("is_simple_athlete"):
            if not data.get("name"):
                raise serializers.ValidationError(
                    "Name is required for simple athletes"
                )
            if not data.get("age"):
                raise serializers.ValidationError("Age is required for simple athletes")
            if not data.get("gender"):
                raise serializers.ValidationError(
                    "Gender is required for simple athletes"
                )
        else:
            if not data.get("user_account_id"):
                raise serializers.ValidationError(
                    "User_account_id is required for regular athletes"
                )
        return data


class UpdateClimberSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=30, required=False)
    age = serializers.IntegerField(min_value=1, max_value=99, required=False)
    gender = serializers.ChoiceField(choices=["KK", "KVK"], required=False)


class CreateRegistrationSerializer(serializers.Serializer):
    climber = serializers.IntegerField()
    competition = serializers.IntegerField()
    competition_category = serializers.IntegerField()
