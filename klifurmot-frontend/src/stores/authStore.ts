import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { UserAccount } from '@/types';

interface AuthState {
    userAccount: UserAccount | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;

    setTokens: (access: string, refresh: string) => void;
    setUserAccount: (userAccount: UserAccount) => void;
    clearTokens: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            userAccount: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,

            setTokens: (access, refresh) =>
                set({
                    accessToken: access,
                    refreshToken: refresh,
                    isAuthenticated: true,
                }),

            setUserAccount: (userAccount) => set({ userAccount }),

            clearTokens: () =>
                set({
                    userAccount: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                }),
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                userAccount: state.userAccount,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
            }),
        },
    ),
);
