from typing import Dict, List, Optional, TypedDict

from athletes.models import Climber


class CompetitionAthletesResult(TypedDict):
    competition: str
    categories: Dict[str, List[Climber]]


class RouteInfo(TypedDict):
    number: int
    tops: int
    zones: int


class RoundDataRoute(TypedDict):
    round_name: str
    routes: List[RouteInfo]


class CompetitionRoute(TypedDict):
    category: str
    rounds: List[RoundDataRoute]


class AthleteInfo(TypedDict):
    start_order: Optional[int]
    full_name: Optional[str]
    category_name: Optional[str]


class RoundDataStartlist(TypedDict):
    round_name: str
    athletes: List[AthleteInfo]


class CompetitionStartlist(TypedDict):
    category: str
    rounds: List[RoundDataRoute]


class RouteScore(TypedDict):
    route_number: int
    attempted: bool
    top_reached: bool
    zone_reached: bool
    attempts_top: int
    attempts_zone: int


class ClimberResult(TypedDict):
    rank: int
    full_name: str
    tops: Optional[int]
    attempts_top: Optional[int]
    zones: Optional[int]
    attempts_zone: Optional[int]
    total_score: float
    routes: list[RouteScore]


class RoundResult(TypedDict):
    round_name: str
    results: list[ClimberResult]


class CompetitionResult(TypedDict):
    category: str
    rounds: List[RoundResult]
