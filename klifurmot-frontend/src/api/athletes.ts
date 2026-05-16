import { api } from './client';

import type {
    ApiSuccessResponse,
    Athlete,
    AthleteAdmin,
    Registration,
    CreateAthleteRequestAdmin,
    UpdateAthleteRequestAdmin,
    CreateRegistrationRequest,
    AthleteDetail,
} from '@/types';

export const athletesApi = {
    // Public endpoints
    listPublicAthletes: async (
        search?: string,
    ): Promise<ApiSuccessResponse<Athlete[]>> => {
        const params = search ? { search } : {};
        const response = await api.get<ApiSuccessResponse<Athlete[]>>(
            '/athletes/public',
            { params },
        );
        return response.data;
    },

    getPublicAthleteDetail: async (
        athleteId: number,
    ): Promise<ApiSuccessResponse<AthleteDetail>> => {
        const response = await api.get<ApiSuccessResponse<AthleteDetail>>(
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
        data: CreateAthleteRequestAdmin,
    ): Promise<ApiSuccessResponse<AthleteAdmin>> => {
        const response = await api.post<ApiSuccessResponse<AthleteAdmin>>(
            '/athletes/',
            data,
        );
        return response.data;
    },

    updateAthlete: async (
        climberId: number,
        data: UpdateAthleteRequestAdmin,
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
};
