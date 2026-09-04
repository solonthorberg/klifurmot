from typing import Literal, Optional, TypedDict, Union

from rest_framework.fields import DateField


class PublicClimber(TypedDict):
    id: int
    user_account_id: int
    full_name: str
    age: Optional[int]
    gender: Optional[str]
    category: Optional[str]
    nationality: Optional[str]


class ClimberScoreResult(TypedDict):
    round_name: str
    round_order: int
    rank: int | None


class CompetitionResult(TypedDict):
    id: int
    title: str
    category: str
    start_date: DateField
    results: Optional[ClimberScoreResult]


class PublicAthleteDetailResult(PublicClimber):
    height_cm: Optional[int]
    wingspan_cm: Optional[int]
    profile_picture: Optional[str]
    competitions_count: int
    wins_count: int
    competition_results: list[CompetitionResult]


class SimpleClimberResult(TypedDict):
    id: int
    is_simple_athlete: Literal[True]
    full_name: str
    age: int | None
    gender: str | None
    category: str | None


class LinkedClimberResult(TypedDict):
    id: int
    is_simple_athlete: Literal[False]
    user_account_id: int
    full_name: str
    age: int | None
    gender: str | None
    category: str | None
    nationality: str | None


ClimberResult = Union[SimpleClimberResult, LinkedClimberResult]


class RegistrationResult(TypedDict):
    id: int
    climber_id: int
    climber_name: Optional[str]
    competition_id: int
    competition_title: str
    category: str
