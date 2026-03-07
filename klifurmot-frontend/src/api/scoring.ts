import { api } from './client';

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
} from '@/types';

export const scoringApi = {
    // Climbs
    listClimbs: async (
        roundId: number,
        climberId?: number,
    ): Promise<ApiSuccessResponse<Climb[]>> => {
        const params: Record<string, number> = { round_id: roundId };
        if (climberId) params.climber_id = climberId;

        const response = await api.get<ApiSuccessResponse<Climb[]>>(
            '/scoring/climbs/',
            { params },
        );
        return response.data;
    },

    getClimb: async (climbId: number): Promise<ApiSuccessResponse<Climb>> => {
        const response = await api.get<ApiSuccessResponse<Climb>>(
            `/scoring/climbs/${climbId}/`,
        );
        return response.data;
    },

    createClimb: async (
        data: CreateClimbRequest,
    ): Promise<ApiSuccessResponse<Climb>> => {
        const response = await api.post<ApiSuccessResponse<Climb>>(
            '/scoring/climbs/',
            data,
        );
        return response.data;
    },

    updateClimb: async (
        climbId: number,
        data: UpdateClimbRequest,
    ): Promise<ApiSuccessResponse<Climb>> => {
        const response = await api.patch<ApiSuccessResponse<Climb>>(
            `/scoring/climbs/${climbId}/`,
            data,
        );
        return response.data;
    },

    deleteClimb: async (climbId: number): Promise<ApiSuccessResponse<void>> => {
        const response = await api.delete(`/scoring/climbs/${climbId}/`);
        return response.data;
    },

    // Startlist
    listStartlist: async (
        roundId: number,
    ): Promise<ApiSuccessResponse<StartlistEntry[]>> => {
        const response = await api.get<ApiSuccessResponse<StartlistEntry[]>>(
            '/scoring/startlist/',
            {
                params: { round_id: roundId },
            },
        );
        return response.data;
    },

    addToStartlist: async (
        data: CreateStartlistRequest,
    ): Promise<ApiSuccessResponse<StartlistEntry>> => {
        const response = await api.post<ApiSuccessResponse<StartlistEntry>>(
            '/scoring/startlist/',
            data,
        );
        return response.data;
    },

    updateStartlist: async (
        resultId: number,
        data: UpdateStartlistRequest,
    ): Promise<ApiSuccessResponse<StartlistEntry>> => {
        const response = await api.patch<ApiSuccessResponse<StartlistEntry>>(
            `/scoring/startlist/${resultId}/`,
            data,
        );
        return response.data;
    },

    removeFromStartlist: async (
        resultId: number,
    ): Promise<ApiSuccessResponse<void>> => {
        const response = await api.delete(`/scoring/startlist/${resultId}/`);
        return response.data;
    },

    // Scores
    listScores: async (
        roundId: number,
    ): Promise<ApiSuccessResponse<Score[]>> => {
        const response = await api.get<ApiSuccessResponse<Score[]>>(
            '/scoring/scores/',
            {
                params: { round_id: roundId },
            },
        );
        return response.data;
    },

    // Advance climbers to next round
    advanceClimbers: async (
        roundId: number,
    ): Promise<ApiSuccessResponse<AdvanceClimbersResponse>> => {
        const response = await api.post<
            ApiSuccessResponse<AdvanceClimbersResponse>
        >(`/scoring/rounds/${roundId}/advance/`);
        return response.data;
    },
};
