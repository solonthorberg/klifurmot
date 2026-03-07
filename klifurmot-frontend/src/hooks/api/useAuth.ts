import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { authApi, getErrorMessage } from '@/api';
import { useAuthStore } from '@/stores';
import { notify } from '@/stores/notificationStore';
import type { LoginRequest, RegisterRequest } from '@/types';

export function useAuth() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const {
        accessToken,
        refreshToken,
        setTokens,
        clearTokens,
        userAccount,
        isAuthenticated,
    } = useAuthStore();

    const meQuery = useQuery({
        queryKey: ['me'],
        queryFn: authApi.getMe,
        enabled: !!accessToken,
        retry: false,
        staleTime: 1000 * 60 * 5,
    });

    const loginMutation = useMutation({
        mutationFn: (data: LoginRequest) => authApi.login(data),
        onSuccess: ({ data, message }) => {
            setTokens(data.access, data.refresh);
            queryClient.invalidateQueries({ queryKey: ['me'] });
            notify.success(message);
            navigate('/');
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
        },
    });

    const registerMutation = useMutation({
        mutationFn: (data: RegisterRequest) => authApi.register(data),
        onSuccess: ({ message }) => {
            notify.success(message);
            navigate('/login');
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
        },
    });

    const googleAuthMutation = useMutation({
        mutationFn: (credential: string) => authApi.googleAuth(credential),
        onSuccess: ({ data, message }) => {
            setTokens(data.access, data.refresh);
            queryClient.invalidateQueries({ queryKey: ['me'] });
            notify.success(message);
            navigate('/');
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
        },
    });

    const logout = async () => {
        try {
            if (refreshToken) {
                await authApi.logout(refreshToken);
            }
        } catch {
            // Ignore logout errors
        } finally {
            clearTokens();
            queryClient.clear();
            notify.success('Logged out');
            navigate('/login');
        }
    };

    return {
        userAccount: meQuery.data?.data ?? userAccount,
        isAuthenticated,
        isLoading: meQuery.isLoading,

        login: loginMutation.mutate,
        loginAsync: loginMutation.mutateAsync,
        isLoggingIn: loginMutation.isPending,

        register: registerMutation.mutate,
        registerAsync: registerMutation.mutateAsync,
        isRegistering: registerMutation.isPending,

        googleAuth: googleAuthMutation.mutate,
        isGoogleAuthPending: googleAuthMutation.isPending,

        logout,
    };
}
