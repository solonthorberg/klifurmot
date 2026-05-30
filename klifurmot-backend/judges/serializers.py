from rest_framework import serializers


class SendInvitationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    name = serializers.CharField(max_length=100, required=False, allow_blank=True)

    def validate_email(self, value):
        return value.strip().lower()

    def validate_name(self, value):
        return value.strip() if value else ""


class SendInvitationResponseSerializer(serializers.Serializer):
    type = serializers.CharField()
    token = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    expires_at = serializers.DateTimeField(source="judge_link.expires_at")
    invitation_url = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()
    created = serializers.SerializerMethodField()
    role_assigned = serializers.SerializerMethodField()

    def get_token(self, obj):
        return str(obj["judge_link"].token)

    def get_email(self, obj):
        return obj["judge_link"].invited_email or obj["judge_link"].user.email

    def get_invitation_url(self, obj):
        request = self.context.get("request")
        if request:
            return f"{request.scheme}://{request.get_host()}/judge/invitation/{obj['judge_link'].token}"
        return None

    def get_user_id(self, obj):
        if obj["type"] == "existing_user":
            return obj["judge_link"].user.id
        return None

    def get_created(self, obj):
        if obj["type"] == "existing_user":
            return obj["created"]
        return None

    def get_role_assigned(self, obj):
        if obj["type"] == "existing_user":
            return obj["role_assigned"]
        return None


class ValidateInvitationResponseSerializer(serializers.Serializer):
    valid = serializers.BooleanField(default=True)
    competition_id = serializers.IntegerField(source="competition.id")
    competition_title = serializers.CharField(source="competition.title")
    invited_email = serializers.EmailField()
    invited_name = serializers.CharField()


class ClaimInvitationUnauthenticatedResponseSerializer(serializers.Serializer):
    authenticated = serializers.BooleanField()
    requires_auth = serializers.BooleanField()
    invitation_valid = serializers.BooleanField()
    competition_title = serializers.CharField()
    invited_name = serializers.CharField()


class CreateJudgeLinkSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()


class JudgeLinkResponseSerializer(serializers.Serializer):
    id = serializers.IntegerField(source="judge_link.id")
    token = serializers.SerializerMethodField()
    user_id = serializers.IntegerField(source="judge_link.user.id")
    user_email = serializers.EmailField(source="judge_link.user.email")
    expires_at = serializers.DateTimeField(source="judge_link.expires_at")
    created = serializers.BooleanField()
    role_assigned = serializers.BooleanField()
    judge_link_url = serializers.SerializerMethodField()

    def get_token(self, obj):
        return str(obj["judge_link"].token)

    def get_judge_link_url(self, obj):
        request = self.context.get("request")
        if request:
            return f"{request.scheme}://{request.get_host()}/judge/login/{obj['judge_link'].token}"
        return None


class ValidateJudgeLinkResponseSerializer(serializers.Serializer):
    competition_id = serializers.IntegerField(source="competition.id")
    competition_title = serializers.CharField(source="competition.title")
    user_id = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()

    def get_user_id(self, obj):
        return obj["judge_link"].user.id if obj["judge_link"].user else None

    def get_user_email(self, obj):
        return obj["judge_link"].user.email if obj["judge_link"].user else None
