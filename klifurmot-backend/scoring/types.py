from typing import NamedTuple, Optional, TypedDict

from scoring.models import ClimberRoundScore


class Climb(TypedDict):
    id: int
    climber_id: int
    climber_name: Optional[str]
    route_id: int
    route_number: int
    attempts_top: Optional[int]
    attempts_zone: Optional[int]
    top_reached: Optional[bool]
    zone_reached: Optional[bool]


class StartlistEntry(TypedDict):
    id: int
    climber_id: int
    climber_name: Optional[str]
    start_order: Optional[int]
    gender: Optional[str]
    rank: Optional[int]


class BoulderAttemptRecord(TypedDict):
    attempts_top: int
    attempts_zone: int
    top_reached: bool
    zone_reached: bool


class BoulderScore(TypedDict):
    rank: int
    climber_id: int
    climber_name: Optional[str]
    tops: Optional[int]
    zones: Optional[int]
    attempts_tops: Optional[int]
    attempts_zones: Optional[int]
    total_score: float


class AdvanceClimbersResult(TypedDict):
    advanced: int
    next_round_id: int
    next_round_name: str


class RankedClimberResult(NamedTuple):
    climber_id: int
    score: ClimberRoundScore
    rank: int
