from rest_framework import serializers


class CreateClimbSerializer(serializers.Serializer):
    climber = serializers.IntegerField()
    boulder = serializers.IntegerField()
    attempts_top = serializers.IntegerField(min_value=0, default=0)
    attempts_zone = serializers.IntegerField(min_value=0, default=0)
    top_reached = serializers.BooleanField(default=False)
    zone_reached = serializers.BooleanField(default=False)


class UpdateClimbSerializer(serializers.Serializer):
    attempts_top = serializers.IntegerField(min_value=0, required=False)
    attempts_zone = serializers.IntegerField(min_value=0, required=False)
    top_reached = serializers.BooleanField(required=False)
    zone_reached = serializers.BooleanField(required=False)


class CreateStartlistSerializer(serializers.Serializer):
    round = serializers.IntegerField()
    climber = serializers.IntegerField()
    start_order = serializers.IntegerField(min_value=1)


class UpdateStartlistSerializer(serializers.Serializer):
    start_order = serializers.IntegerField(min_value=1, required=False)
