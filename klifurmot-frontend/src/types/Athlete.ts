export interface Athlete {
  id: number;
  user_account_id: number;
  name: string;
  age: number;
  category: string;
  nationality: string;
}

export interface Climber {
  id: number;
  is_simple_athlete: boolean;
  simple_name: string | null;
  simple_age: number | null;
  simple_gender: 'KK' | 'KVK' | null;
  user_account: {
    id: number;
    full_name: string | null;
    gender: 'KK' | 'KVK' | null;
    date_of_birth: string | null;
    nationality: string | null;
    profile_picture: string | null;
    age?: number;
    age_category?: string;
  } | null;
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
