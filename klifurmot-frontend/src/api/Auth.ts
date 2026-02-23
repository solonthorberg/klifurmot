import { api } from './Client';

import type {
  ApiSuccessResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  User,
  UserProfile,
} from '@/types/Index';

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<ApiSuccessResponse<LoginResponse>>(
      '/accounts/login/',
      data,
    );
    return response.data.data;
  },

  register: async (data: RegisterRequest): Promise<void> => {
    await api.post('/accounts/register/', data);
  },

  logout: async (refresh: string): Promise<void> => {
    await api.post('/accounts/logout/', { refresh });
  },

  refreshToken: async (refresh: string): Promise<{ access: string }> => {
    const response = await api.post<ApiSuccessResponse<{ access: string }>>(
      '/accounts/token/refresh/',
      { refresh },
    );
    return response.data.data;
  },

  getMe: async (): Promise<{ user: User; profile: UserProfile }> => {
    const response =
      await api.get<ApiSuccessResponse<{ user: User; profile: UserProfile }>>(
        '/accounts/me/',
      );
    return response.data.data;
  },

  googleAuth: async (token: string): Promise<LoginResponse> => {
    const response = await api.post<ApiSuccessResponse<LoginResponse>>(
      '/accounts/google-login/',
      { token },
    );
    return response.data.data;
  },
};
