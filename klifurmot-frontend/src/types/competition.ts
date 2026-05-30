import type {
    CreateCategoryFormData,
    CreateRoundFormData,
} from '@/schemas/competition';

export interface Competition {
    id: number;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string;
    location: string | null;
    image: string | null;
    visible: boolean;
    status: 'not_started' | 'ongoing' | 'finished';
    created_at: string;
    created_by: string;
    last_modified_at: string;
}

export interface DraftCategory extends CreateCategoryFormData {
    key: string;
    category_group_name: string;
    rounds: DraftRound[];
}

export interface DraftRound extends CreateRoundFormData {
    key: string;
    round_group_name: string;
}

export interface RoundGroup {
    id: number;
    name: string;
    is_default: boolean;
}

export interface CategoryGroup {
    id: number;
    name: string;
    min_age: number | null;
    max_age: number | null;
    is_default: boolean;
}

export interface CompetitionCategory {
    id: number;
    competition: number;
    category_group: number;
    category_group_detail: CategoryGroup;
    gender: 'KK' | 'KVK';
}

export interface RoundData {
    phases: Phase[];
}

export interface Phase {
    round_order: number;
    round_name: string;
    rounds: Round[];
}

export interface Round {
    id: number;
    competition_category: number;
    category_group_name: string;
    gender: string;
    round_group: number;
    round_group_name: string;
    round_order: number;
    climbers_advance: number;
    route_count: number;
    start_date: null;
    end_date: null;
    is_self_scoring: boolean;
    completed: boolean;
    status: string;
}

export interface Route {
    id: number;
    round: number;
    route_number: number;
    section_style: string | null;
}

export interface UpdateRouteRequest {
    image?: File;
    section_style?: string;
}

// Response types for nested endpoints
export interface CompetitionAthlete {
    id: number;
    full_name: string;
    age: number | null;
    category_name: string;
    gender: string;
    nationality: string | null;
}

export interface CompetitionAthletesResponse {
    competition: string;
    categories: Record<string, CompetitionAthlete[]>;
}

export interface RouteStats {
    number: number;
    tops: number;
    zones: number;
}

export interface RoundRoutes {
    round_name: string;
    routes: RouteStats[];
}

export interface CategoryRoutes {
    category: string;
    rounds: RoundRoutes[];
}

export interface StartlistAthlete {
    start_order: number;
    full_name: string;
    category_name: string;
}

export interface RoundStartlist {
    round_name: string;
    athletes: StartlistAthlete[];
}

export interface CategoryStartlist {
    category: string;
    rounds: RoundStartlist[];
}

export interface RouteScore {
    route_number: number;
    attempted: boolean;
    top_reached: boolean;
    zone_reached: boolean;
    attempts_top: number;
    attempts_zone: number;
}

export interface ResultEntry {
    rank: number;
    full_name: string;
    tops: number;
    attempts_top: number;
    zones: number;
    attempts_zone: number;
    total_score: number;
    routes: RouteScore[];
}

export interface RoundResults {
    round_name: string;
    results: ResultEntry[];
}

export interface CategoryResults {
    category: string;
    rounds: RoundResults[];
}
