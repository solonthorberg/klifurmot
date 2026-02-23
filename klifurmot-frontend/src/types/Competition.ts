export interface Competition {
  id: number;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  location: string | null;
  image: string | null;
  visible: boolean;
  status: string;
  created_at: string;
  last_modified_at: string;
}

export interface CreateCompetitionRequest {
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  location?: string;
  image?: File;
  visible?: boolean;
}

export interface UpdateCompetitionRequest {
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  image?: File;
  visible?: boolean;
  remove_image?: boolean;
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
}

export interface CompetitionCategory {
  id: number;
  competition: number;
  category_group: number;
  category_group_detail: CategoryGroup;
  gender: 'KK' | 'KVK';
}

export interface CreateCategoryRequest {
  competition: number;
  category_group: number;
  gender: 'KK' | 'KVK';
}

export interface UpdateCategoryRequest {
  category_group?: number;
  gender?: 'KK' | 'KVK';
}

export interface Round {
  id: number;
  competition_category: number;
  round_group: number;
  round_order: number;
  climbers_advance: number;
  boulder_count: number;
  start_date: string | null;
  end_date: string | null;
  is_self_scoring: boolean;
  completed: boolean;
}

export interface CreateRoundRequest {
  competition_category: number;
  round_group: number;
  round_order: number;
  climbers_advance?: number;
  boulder_count?: number;
  start_date?: string;
  end_date?: string;
  is_self_scoring?: boolean;
}

export interface UpdateRoundRequest {
  round_group?: number;
  round_order?: number;
  climbers_advance?: number;
  boulder_count?: number;
  start_date?: string;
  end_date?: string;
  is_self_scoring?: boolean;
}

export interface Boulder {
  id: number;
  round: number;
  boulder_number: number;
  section_style: string | null;
}

export interface UpdateBoulderRequest {
  image?: File;
  section_style?: string;
}

// Response types for nested endpoints
export interface CompetitionAthlete {
  id: number;
  full_name: string | null;
  age: number | null;
  category_name: string;
}

export interface CompetitionAthletesResponse {
  competition: string;
  categories: Record<string, CompetitionAthlete[]>;
}

export interface BoulderStats {
  number: number;
  tops: number;
  zones: number;
}

export interface RoundBoulders {
  round_name: string;
  boulders: BoulderStats[];
}

export interface CategoryBoulders {
  category: string;
  rounds: RoundBoulders[];
}

export interface StartlistAthlete {
  start_order: number;
  full_name: string | null;
  age_category: string;
}

export interface RoundStartlist {
  round_name: string;
  athletes: StartlistAthlete[];
}

export interface CategoryStartlist {
  category: string;
  rounds: RoundStartlist[];
}

export interface ResultEntry {
  rank: number;
  full_name: string;
  tops: number;
  attempts_top: number;
  zones: number;
  attempts_zone: number;
  total_score: number;
}

export interface RoundResults {
  round_name: string;
  results: ResultEntry[];
}

export interface CategoryResults {
  category: {
    id: number;
    gender: 'KK' | 'KVK';
    group: {
      id: number;
      name: string;
    };
  };
  rounds: RoundResults[];
}
