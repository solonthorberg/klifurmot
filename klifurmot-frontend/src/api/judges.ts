import { api } from './client';
import type {
    ApiSuccessResponse,
    PotentialJudge,
    AllJudgesResponse,
} from '@/types';

export const judgesApi = {
    getPotentialJudges: async (): Promise<
        ApiSuccessResponse<PotentialJudge[]>
    > => {
        const response = await api.get<ApiSuccessResponse<PotentialJudge[]>>(
            '/judges/potential-judges/',
        );
        return response.data;
    },

    getAllJudges: async (
        competitionId: number,
    ): Promise<ApiSuccessResponse<AllJudgesResponse>> => {
        const response = await api.get<ApiSuccessResponse<AllJudgesResponse>>(
            `/judges/all/${competitionId}/`,
        );
        return response.data;
    },

    createJudgeLink: async (
        competitionId: number,
        data: { user_id: number },
    ): Promise<ApiSuccessResponse<void>> => {
        const response = await api.post(
            `/judges/links/competition/${competitionId}/`,
            data,
        );
        return response.data;
    },

    sendInvitation: async (
        competitionId: number,
        data: { email: string; name?: string },
    ): Promise<ApiSuccessResponse<void>> => {
        const response = await api.post(
            `/judges/invitations/${competitionId}/`,
            data,
        );
        return response.data;
    },

    deleteJudgeLink: async (
        linkId: number,
    ): Promise<ApiSuccessResponse<void>> => {
        const response = await api.delete(`/judges/links/link/${linkId}/`);
        return response.data;
    },

    validateJudgeLink: async (
        token: string,
    ): Promise<
        ApiSuccessResponse<{
            competition_id: number;
            user_id: number;
            user_email: string;
        }>
    > => {
        const response = await api.get(`/judges/links/${token}/`);
        return response.data;
    },

    claimInvitation: async (
        token: string,
    ): Promise<
        ApiSuccessResponse<
            | { competition_id: number }
            | {
                  requires_auth: boolean;
                  invitation_valid: boolean;
                  competition_title: string;
                  invited_name: string;
              }
        >
    > => {
        const response = await api.post(`/judges/invitations/claim/${token}/`);
        return response.data;
    },
};
