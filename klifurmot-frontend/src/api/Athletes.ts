import { api } from './Client';

import type {
  ApiSuccessResponse,
  Athlete,
  Climber,
  Registration,
  CreateClimberRequest,
  UpdateClimberRequest,
  CreateRegistrationRequest,
} from '@/types/Index';

export const athletesApi = {
  // Public endpoints
  list: async (search?: string): Promise<Athlete[]> => {
    const params = search ? { search } : {};
    const response = await api.get<ApiSuccessResponse<Athlete[]>>(
      '/athletes/',
      { params },
    );
    return response.data.data;
  },

  get: async (athleteId: number): Promise<Athlete> => {
    const response = await api.get<ApiSuccessResponse<Athlete>>(
      `/athletes/${athleteId}/`,
    );
    return response.data.data;
  },

  // Admin endpoints
  listClimbers: async (search?: string): Promise<Climber[]> => {
    const params = search ? { search } : {};
    const response = await api.get<ApiSuccessResponse<Climber[]>>(
      '/athletes/admin/',
      { params },
    );
    return response.data.data;
  },

  getClimber: async (climberId: number): Promise<Climber> => {
    const response = await api.get<ApiSuccessResponse<Climber>>(
      `/athletes/admin/${climberId}/`,
    );
    return response.data.data;
  },

  createClimber: async (data: CreateClimberRequest): Promise<Climber> => {
    const response = await api.post<ApiSuccessResponse<Climber>>(
      '/athletes/admin/',
      data,
    );
    return response.data.data;
  },

  updateClimber: async (
    climberId: number,
    data: UpdateClimberRequest,
  ): Promise<Climber> => {
    const response = await api.patch<ApiSuccessResponse<Climber>>(
      `/athletes/admin/${climberId}/`,
      data,
    );
    return response.data.data;
  },

  deleteClimber: async (climberId: number): Promise<void> => {
    await api.delete(`/athletes/admin/${climberId}/`);
  },

  // Registration endpoints
  listRegistrations: async (
    competitionId?: number,
  ): Promise<Registration[]> => {
    const params = competitionId ? { competition_id: competitionId } : {};
    const response = await api.get<ApiSuccessResponse<Registration[]>>(
      '/athletes/registrations/',
      {
        params,
      },
    );
    return response.data.data;
  },

  createRegistration: async (
    data: CreateRegistrationRequest,
  ): Promise<Registration> => {
    const response = await api.post<ApiSuccessResponse<Registration>>(
      '/athletes/registrations/',
      data,
    );
    return response.data.data;
  },

  deleteRegistration: async (registrationId: number): Promise<void> => {
    await api.delete(`/athletes/registrations/${registrationId}/`);
  },
};
