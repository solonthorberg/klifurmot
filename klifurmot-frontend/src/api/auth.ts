import { api } from './client';

import type {
    ApiSuccessResponse,
    LoginRequest,
    LoginResponse,
    PasswordResetRequest,
    RegisterRequest,
    UserAccount,
} from '@/types';

export const authApi = {
    login: async (
        data: LoginRequest,
    ): Promise<ApiSuccessResponse<LoginResponse>> => {
        const response = await api.post<ApiSuccessResponse<LoginResponse>>(
            '/auth/login/',
            data,
        );
        return response.data;
    },

    register: async (
        data: RegisterRequest,
    ): Promise<ApiSuccessResponse<null>> => {
        const response = await api.post('/auth/register/', data);
        return response.data;
    },

    logout: async (refresh: string): Promise<ApiSuccessResponse<null>> => {
        const response = await api.post('/auth/logout/', { refresh });
        return response.data;
    },

    refreshToken: async (
        refresh: string,
    ): Promise<ApiSuccessResponse<{ access: string; refresh: string }>> => {
        const response = await api.post<
            ApiSuccessResponse<{ access: string; refresh: string }>
        >('/auth/refresh/', { refresh });
        return response.data;
    },

    requestPasswordReset: async (
        data: PasswordResetRequest,
    ): Promise<ApiSuccessResponse<null>> => {
        const response = await api.post<ApiSuccessResponse<null>>(
            '/auth/password-reset/',
            data,
        );
        return response.data;
    },

    getMe: async (): Promise<ApiSuccessResponse<UserAccount>> => {
        const response = await api.get<ApiSuccessResponse<UserAccount>>('/me/');
        return response.data;
    },

    googleAuth: async (
        token: string,
    ): Promise<ApiSuccessResponse<LoginResponse>> => {
        const response = await api.post<ApiSuccessResponse<LoginResponse>>(
            '/auth/google-login/',
            { token },
        );
        return response.data;
    },
};
