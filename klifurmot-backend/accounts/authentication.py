from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed


class ActiveJWTAuthentication(JWTAuthentication):
    """
    JWT authentication that also rejects soft-deleted accounts.

    Closes the window where a user with a still-valid access token continues
    to use the API after their account has been soft-deleted.
    """

    def get_user(self, validated_token):
        user = super().get_user(validated_token)

        profile = getattr(user, "profile", None)
        if not profile:
            raise AuthenticationFailed("No user profile found", code="no_profile")
        if profile.deleted:
            raise AuthenticationFailed("Account is inactive", code="account_deleted")

        return user
