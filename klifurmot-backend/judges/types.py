from typing import Literal, Optional, TypedDict

from django.utils.timezone import datetime

from accounts.models import CompetitionRole
from judges.models import JudgeLink


class SendJudgeInvitationResult(TypedDict):
    judge_link: JudgeLink
    type: str
    created: bool
    role_assigned: Optional[CompetitionRole]


class ValidateInvitationResult(TypedDict):
    competition: str
    invited_email: Optional[str]
    invited_name: Optional[str]


class ClaimInvitationTrueResult(TypedDict):
    authenticated: Literal[True]
    competition_id: int


class ClaimInvitationFalseResult(TypedDict):
    authenticated: Literal[False]
    requires_auth: bool
    invitation_valid: bool
    competition_title: str
    invited_name: Optional[str]


class CompetitionInvitationsResult(TypedDict):
    id: int
    type: str
    invited_email: Optional[str]
    invited_name: Optional[str]
    status: str
    expires_at: Optional[datetime]
    claimed_at: Optional[datetime]
    created_at: Optional[datetime]
    token: str


class CreateJudgeLinkResult(TypedDict):
    judge_link: JudgeLink
    created: bool
    role_assigned: Optional[CompetitionRole]


class JudgeLinkValidateResult(TypedDict):
    competition: str
    judge_link: JudgeLink


class CompetitionJudgeLinkResult(TypedDict):
    id: int
    type: str
    user_id: int
    user_email: Optional[str]
    user_name: Optional[str]
    status: str
    expires_at: Optional[datetime]
    created_at: Optional[datetime]
    token: str


class PotentialJudgesResult(TypedDict):
    id: int
    full_name: str
    email: str
    username: str
