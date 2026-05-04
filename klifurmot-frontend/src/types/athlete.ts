export interface Athlete {
    id: number;
    user_account_id: number;
    name: string;
    age: number;
    gender: 'KK' | 'KVK' | null;
    category: string;
    nationality: string;
}

export interface AthleteDetail {
    id: number;
    user_account_id: number;
    full_name: string;
    age: number;
    height_cm: null;
    wingspan_cm: null;
    profile_picture: null;
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

export interface Climber {
    id: number;
    is_simple_athlete: boolean;
    simple_name: string | null;
    simple_age: number | null;
    simple_gender: 'KK' | 'KVK' | null;
    user_account: ClimberUserAccount | null;
}

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

export interface CreateClimberRequest {
    is_simple_athlete: boolean;
    name?: string;
    age?: number;
    gender?: 'KK' | 'KVK';
    user_account_id?: number;
}

export interface UpdateClimberRequest {
    name?: string;
    age?: number;
    gender?: 'KK' | 'KVK';
}

export interface CreateRegistrationRequest {
    climber: number;
    competition: number;
    competition_category: number;
}
