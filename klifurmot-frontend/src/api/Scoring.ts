import { api } from './Client';

import type {
  ApiSuccessResponse,
  Climb,
  CreateClimbRequest,
  UpdateClimbRequest,
  StartlistEntry,
  CreateStartlistRequest,
  UpdateStartlistRequest,
  Score,
  AdvanceClimbersResponse,
} from '@/types/Index';

export const scoringApi = {
  // Climbs
  listClimbs: async (roundId: number, climberId?: number): Promise<Climb[]> => {
    const params: Record<string, number> = { round_id: roundId };
    if (climberId) params.climber_id = climberId;

    const response = await api.get<ApiSuccessResponse<Climb[]>>(
      '/scoring/climbs/',
      { params },
    );
    return response.data.data;
  },

  getClimb: async (climbId: number): Promise<Climb> => {
    const response = await api.get<ApiSuccessResponse<Climb>>(
      `/scoring/climbs/${climbId}/`,
    );
    return response.data.data;
  },

  createClimb: async (data: CreateClimbRequest): Promise<Climb> => {
    const response = await api.post<ApiSuccessResponse<Climb>>(
      '/scoring/climbs/',
      data,
    );
    return response.data.data;
  },

  updateClimb: async (
    climbId: number,
    data: UpdateClimbRequest,
  ): Promise<Climb> => {
    const response = await api.patch<ApiSuccessResponse<Climb>>(
      `/scoring/climbs/${climbId}/`,
      data,
    );
    return response.data.data;
  },

  deleteClimb: async (climbId: number): Promise<void> => {
    await api.delete(`/scoring/climbs/${climbId}/`);
  },

  // Startlist
  listStartlist: async (roundId: number): Promise<StartlistEntry[]> => {
    const response = await api.get<ApiSuccessResponse<StartlistEntry[]>>(
      '/scoring/startlist/',
      {
        params: { round_id: roundId },
      },
    );
    return response.data.data;
  },

  addToStartlist: async (
    data: CreateStartlistRequest,
  ): Promise<StartlistEntry> => {
    const response = await api.post<ApiSuccessResponse<StartlistEntry>>(
      '/scoring/startlist/',
      data,
    );
    return response.data.data;
  },

  updateStartlist: async (
    resultId: number,
    data: UpdateStartlistRequest,
  ): Promise<StartlistEntry> => {
    const response = await api.patch<ApiSuccessResponse<StartlistEntry>>(
      `/scoring/startlist/${resultId}/`,
      data,
    );
    return response.data.data;
  },

  removeFromStartlist: async (resultId: number): Promise<void> => {
    await api.delete(`/scoring/startlist/${resultId}/`);
  },

  // Scores
  listScores: async (roundId: number): Promise<Score[]> => {
    const response = await api.get<ApiSuccessResponse<Score[]>>(
      '/scoring/scores/',
      {
        params: { round_id: roundId },
      },
    );
    return response.data.data;
  },

  // Advance climbers to next round
  advanceClimbers: async (
    roundId: number,
  ): Promise<AdvanceClimbersResponse> => {
    const response = await api.post<
      ApiSuccessResponse<AdvanceClimbersResponse>
    >(`/scoring/rounds/${roundId}/advance/`);
    return response.data.data;
  },
};
