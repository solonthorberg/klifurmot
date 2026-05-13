import { api } from './client';

import type {
    ApiSuccessResponse,
    AuthResponse,
    Countries,
    LoginRequest,
    LoginResponse,
    PasswordResetRequest,
    RegisterRequest,
    UpdateUserAccount,
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
    ): Promise<ApiSuccessResponse<AuthResponse>> => {
        const response = await api.post('/auth/register/', data);
        return response.data;
    },

    logout: async (): Promise<ApiSuccessResponse<null>> => {
        const response = await api.post('/auth/logout/');
        return response.data;
    },

    refreshToken: async (): Promise<ApiSuccessResponse<{ access: string }>> => {
        const response =
            await api.post<ApiSuccessResponse<{ access: string }>>(
                '/auth/refresh/',
            );
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

    updateMe: async (
        data: UpdateUserAccount,
    ): Promise<ApiSuccessResponse<UserAccount>> => {
        const response = await api.patch<ApiSuccessResponse<UserAccount>>(
            '/me/',
            data,
        );
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

    getCountries: async (): Promise<ApiSuccessResponse<Countries[]>> => {
        const response =
            await api.get<ApiSuccessResponse<Countries[]>>('/countries/');
        return response.data;
    },
};
