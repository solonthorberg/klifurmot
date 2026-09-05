export interface PublicAthlete {
    id: number;
    user_account_id: number;
    full_name: string;
    age: number;
    gender: 'KK' | 'KVK';
    category: string;
    nationality: string;
}

export interface PublicAthleteDetail {
    id: number;
    user_account_id: number;
    full_name: string;
    age: number;
    height_cm: number;
    wingspan_cm: number;
    profile_picture: string;
    gender: string;
    nationality: string;
    category: string;
    competitions_count: number;
    wins_count: number;
    competition_results: CompetitionResult[];
}

export interface CompetitionResult {
    id: number;
    title: string;
    category: string;
    start_date: Date;
    results: Result[];
}

export interface Result {
    round_name: string;
    round_order: number;
    rank: number;
}

export interface SimpleClimberResult {
    id: number;
    is_simple_athlete: true;
    full_name: string;
    age: number | null;
    gender: 'KK' | 'KVK' | null;
    category: string | null;
}

export interface LinkedClimberResult {
    id: number;
    is_simple_athlete: false;
    user_account_id: number;
    full_name: string;
    age: number | null;
    gender: 'KK' | 'KVK' | null;
    category: string | null;
    nationality: string | null;
}

export type AthleteAdmin = SimpleClimberResult | LinkedClimberResult;

export interface ClimberUserAccount {
    id: number;
    full_name: string | null;
    gender: 'KK' | 'KVK' | null;
    date_of_birth: string | null;
    nationality: string | null;
    profile_picture: string | null;
    age?: number;
    age_category?: string;
}

export interface Registration {
    id: number;
    climber_id: number;
    climber_name: string | null;
    competition_id: number;
    competition_title: string;
    category: string;
}

export interface CreateRegistrationRequest {
    climber: number;
    competition: number;
    competition_category: number;
}
