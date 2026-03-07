import { api } from './client';

import type {
    ApiSuccessResponse,
    Athlete,
    Climber,
    Registration,
    CreateClimberRequest,
    UpdateClimberRequest,
    CreateRegistrationRequest,
} from '@/types';

export const athletesApi = {
    // Public endpoints
    listAthletes: async (
        search?: string,
    ): Promise<ApiSuccessResponse<Athlete[]>> => {
        const params = search ? { search } : {};
        const response = await api.get<ApiSuccessResponse<Athlete[]>>(
            '/athletes/',
            { params },
        );
        return response.data;
    },

    getAthleteDetail: async (
        athleteId: number,
    ): Promise<ApiSuccessResponse<Athlete>> => {
        const response = await api.get<ApiSuccessResponse<Athlete>>(
            `/athletes/${athleteId}/`,
        );
        return response.data;
    },

    // Admin endpoints
    listAllClimbers: async (
        search?: string,
    ): Promise<ApiSuccessResponse<Climber[]>> => {
        const params = search ? { search } : {};
        const response = await api.get<ApiSuccessResponse<Climber[]>>(
            '/athletes/admin/',
            { params },
        );
        return response.data;
    },

    getClimber: async (
        climberId: number,
    ): Promise<ApiSuccessResponse<Climber>> => {
        const response = await api.get<ApiSuccessResponse<Climber>>(
            `/athletes/admin/${climberId}/`,
        );
        return response.data;
    },

    createClimber: async (
        data: CreateClimberRequest,
    ): Promise<ApiSuccessResponse<Climber>> => {
        const response = await api.post<ApiSuccessResponse<Climber>>(
            '/athletes/admin/',
            data,
        );
        return response.data;
    },

    updateClimber: async (
        climberId: number,
        data: UpdateClimberRequest,
    ): Promise<ApiSuccessResponse<Climber>> => {
        const response = await api.patch<ApiSuccessResponse<Climber>>(
            `/athletes/admin/${climberId}/`,
            data,
        );
        return response.data;
    },

    deleteClimber: async (climberId: number): Promise<void> => {
        await api.delete(`/athletes/admin/${climberId}/`);
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
