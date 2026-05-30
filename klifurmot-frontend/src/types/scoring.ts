export interface Climb {
    id: number;
    climber_id: number;
    climber_name: string | null;
    route_id: number;
    route_number: number;
    attempts_top: number;
    attempts_zone: number;
    top_reached: boolean;
    zone_reached: boolean;
}

export interface CreateClimbRequest {
    climber: number;
    route: number;
    attempts_top?: number;
    attempts_zone?: number;
    top_reached?: boolean;
    zone_reached?: boolean;
}

export interface UpdateClimbRequest {
    attempts_top?: number;
    attempts_zone?: number;
    top_reached?: boolean;
    zone_reached?: boolean;
}

export interface StartlistEntry {
    id: number;
    climber_id: number;
    climber_name: string | null;
    start_order: number;
    gender: 'KK' | 'KVK' | null;
    rank: number | null;
}

export interface CreateStartlistRequest {
    round: number;
    climber: number;
    start_order: number;
}

export interface UpdateStartlistRequest {
    start_order?: number;
}

export interface Score {
    rank: number;
    climber_id: number;
    climber_name: string | null;
    tops: number;
    zones: number;
    attempts_tops: number;
    attempts_zones: number;
    total_score: number;
}

export type AdvanceClimbersResponse = {
    advanced: number;
    next_round_id: number;
    next_round_name: string;
};

export interface BulkUpdateStartlistOrderEntry {
    id: number;
    start_order: number;
}

export interface BulkUpdateStartlistOrderRequest {
    round_id: number;
    entries: BulkUpdateStartlistOrderEntry[];
}
