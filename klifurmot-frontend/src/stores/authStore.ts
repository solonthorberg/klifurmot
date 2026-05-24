import { create } from 'zustand';
import type { UserAccount } from '@/types';

interface AuthState {
    userAccount: UserAccount | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isInitializing: boolean;

    setTokens: (access: string) => void;
    setUserAccount: (userAccount: UserAccount | null) => void;
    clearTokens: () => void;
    setInitialized: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
    userAccount: null,
    accessToken: null,
    isAuthenticated: false,
    isInitializing: true,

    setTokens: (access) => set({ accessToken: access, isAuthenticated: true }),

    setUserAccount: (userAccount) => set({ userAccount }),

    clearTokens: () =>
        set({ userAccount: null, accessToken: null, isAuthenticated: false }),

    setInitialized: () => set({ isInitializing: false }),
}));
