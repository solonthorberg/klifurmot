export interface Climb {
  id: number;
  climber_id: number;
  climber_name: string | null;
  boulder_id: number;
  boulder_number: number;
  attempts_top: number;
  attempts_zone: number;
  top_reached: boolean;
  zone_reached: boolean;
}

export interface CreateClimbRequest {
  climber: number;
  boulder: number;
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

export interface AdvanceClimbersResponse {
  status: 'ok' | 'error';
  advanced?: number;
  next_round_id?: number;
  message?: string;
}
