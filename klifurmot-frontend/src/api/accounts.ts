import { api } from './client';
import type { ApiSuccessResponse } from '@/types';

export interface UserAccount {
    id: number;
    full_name: string | null;
    email: string;
    username: string;
}

export const accountsApi = {
    listUserAccounts: async (): Promise<ApiSuccessResponse<UserAccount[]>> => {
        const response =
            await api.get<ApiSuccessResponse<UserAccount[]>>('/user-accounts/');
        return response.data;
    },
};
