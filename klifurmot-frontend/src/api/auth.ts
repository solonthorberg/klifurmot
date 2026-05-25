import type {
    LoginFormData,
    RegisterFormData,
    RequestPasswordResetFormData,
    ResetPasswordFormData,
} from '@/schemas/auth';
import { api } from './client';

import type {
    ApiSuccessResponse,
    AuthResponse,
    Countries,
    LoginResponse,
    UpdateUserAccount,
    UserAccount,
} from '@/types';

export const authApi = {
    login: async (
        data: LoginFormData,
    ): Promise<ApiSuccessResponse<LoginResponse>> => {
        const response = await api.post<ApiSuccessResponse<LoginResponse>>(
            '/auth/login/',
            data,
        );
        return response.data;
    },

    register: async (
        data: RegisterFormData,
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
        data: RequestPasswordResetFormData,
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
        const formData = new FormData();
        if (data.username) formData.append('username', data.username);
        if (data.height_cm != null)
            formData.append('height_cm', String(data.height_cm));
        if (data.wingspan_cm != null)
            formData.append('wingspan_cm', String(data.wingspan_cm));
        if (data.profile_picture instanceof File)
            formData.append('profile_picture', data.profile_picture);

        const response = await api.patch<ApiSuccessResponse<UserAccount>>(
            '/me/',
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' },
            },
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

    resetPassword: async (
        data: ResetPasswordFormData & { token: string },
    ): Promise<ApiSuccessResponse<null>> => {
        const response = await api.post<ApiSuccessResponse<null>>(
            '/auth/password-reset/confirm/',
            data,
        );
        return response.data;
    },

    getCountries: async (): Promise<ApiSuccessResponse<Countries[]>> => {
        const response =
            await api.get<ApiSuccessResponse<Countries[]>>('/countries/');
        return response.data;
    },
};
