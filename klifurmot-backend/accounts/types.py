from typing import TypedDict

from django.contrib.auth.models import User

from accounts.models import UserAccount


class UserAccountListItem(TypedDict):
    id: int
    full_name: str
    email: str
    username: str


class UserProfileResult(TypedDict):
    user: User
    user_account: UserAccount


class TokenPair(TypedDict):
    access: str
    refresh: str


class AuthResult(TokenPair):
    user: User
    user_account: UserAccount
