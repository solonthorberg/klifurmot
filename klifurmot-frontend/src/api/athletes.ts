import type {
    CreateAthleteFormData,
    UpdateAthleteFormData,
} from '@/schemas/athlete';
import { api } from './client';

import type {
    ApiSuccessResponse,
    PublicAthlete,
    AthleteAdmin,
    Registration,
    CreateRegistrationRequest,
    PublicAthleteDetail,
} from '@/types';

export const athletesApi = {
    // Public endpoints
    listPublicAthletes: async (
        search?: string,
    ): Promise<ApiSuccessResponse<PublicAthlete[]>> => {
        const params = search ? { search } : {};
        const response = await api.get<ApiSuccessResponse<PublicAthlete[]>>(
            '/athletes/public',
            { params },
        );
        return response.data;
    },

    getPublicAthleteDetail: async (
        athleteId: number,
    ): Promise<ApiSuccessResponse<PublicAthleteDetail>> => {
        const response = await api.get<ApiSuccessResponse<PublicAthleteDetail>>(
            `/athletes/public/${athleteId}/`,
        );
        return response.data;
    },

    // Admin endpoints
    listAthletes: async (
        search?: string,
    ): Promise<ApiSuccessResponse<AthleteAdmin[]>> => {
        const params = search ? { search } : {};
        const response = await api.get<ApiSuccessResponse<AthleteAdmin[]>>(
            '/athletes/',
            { params },
        );
        return response.data;
    },

    getAthlete: async (
        climberId: number,
    ): Promise<ApiSuccessResponse<AthleteAdmin>> => {
        const response = await api.get<ApiSuccessResponse<AthleteAdmin>>(
            `/athletes/${climberId}/`,
        );
        return response.data;
    },

    createAthlete: async (
        data: CreateAthleteFormData,
    ): Promise<ApiSuccessResponse<AthleteAdmin>> => {
        const response = await api.post<ApiSuccessResponse<AthleteAdmin>>(
            '/athletes/',
            data,
        );
        return response.data;
    },

    createAthleteForUser: async (
        userAccountId: number,
    ): Promise<ApiSuccessResponse<AthleteAdmin>> => {
        const response = await api.post<ApiSuccessResponse<AthleteAdmin>>(
            '/athletes/',
            { from_account: true, user_account_id: userAccountId },
        );
        return response.data;
    },

    updateAthlete: async (
        climberId: number,
        data: UpdateAthleteFormData,
    ): Promise<ApiSuccessResponse<AthleteAdmin>> => {
        const response = await api.patch<ApiSuccessResponse<AthleteAdmin>>(
            `/athletes/${climberId}/`,
            data,
        );
        return response.data;
    },

    deleteAthlete: async (climberId: number): Promise<void> => {
        await api.delete(`/athletes/${climberId}/`);
    },

    // Registration endpoints
    listRegistrations: async (
        competitionId?: number,
    ): Promise<ApiSuccessResponse<Registration[]>> => {
        const params = competitionId ? { competition_id: competitionId } : {};
        const response = await api.get<ApiSuccessResponse<Registration[]>>(
            '/athletes/registrations/',
            {
                params,
            },
        );
        return response.data;
    },

    createRegistration: async (
        data: CreateRegistrationRequest,
    ): Promise<ApiSuccessResponse<Registration>> => {
        const response = await api.post<ApiSuccessResponse<Registration>>(
            '/athletes/registrations/',
            data,
        );
        return response.data;
    },

    deleteRegistration: async (registrationId: number): Promise<void> => {
        const response = await api.delete(
            `/athletes/registrations/${registrationId}/`,
        );
        return response.data;
    },

    linkAthlete: async (
        climberId: number,
        userAccountId: number,
    ): Promise<ApiSuccessResponse<AthleteAdmin>> => {
        const response = await api.post<ApiSuccessResponse<AthleteAdmin>>(
            `/athletes/${climberId}/link/`,
            { user_account_id: userAccountId },
        );
        return response.data;
    },
};
