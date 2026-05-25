import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { authApi, getErrorMessage } from '@/api';
import { useAuthStore } from '@/stores';
import { notify } from '@/stores/notificationStore';
import type { UpdateUserAccount } from '@/types';
import { useEffect } from 'react';
import type {
    LoginFormData,
    RegisterFormData,
    RequestPasswordResetFormData,
} from '@/schemas/auth';

export function useAuth() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { accessToken, setTokens, clearTokens, userAccount, setUserAccount } =
        useAuthStore();

    const meQuery = useQuery({
        queryKey: ['me'],
        queryFn: authApi.getMe,
        enabled: !!accessToken,
        retry: false,
        staleTime: 1000 * 60 * 5,
    });

    useEffect(() => {
        if (meQuery.data?.data) {
            setUserAccount(meQuery.data.data);
        } else {
            setUserAccount(null);
        }
    }, [meQuery.data, setUserAccount]);

    const meMutation = useMutation({
        mutationFn: (data: UpdateUserAccount) => authApi.updateMe(data),
        onSuccess: (success) => {
            notify.success(success.message);

            if (success.data) {
                setUserAccount(success.data);
            }
            queryClient.invalidateQueries({ queryKey: ['me'] });
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
        },
    });

    const loginMutation = useMutation({
        mutationFn: (data: LoginFormData) => authApi.login(data),
        onSuccess: ({ data, message }) => {
            setTokens(data.access);
            queryClient.invalidateQueries({ queryKey: ['me'] });
            notify.success(message);
            navigate('/profile');
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
        },
    });

    const registerMutation = useMutation({
        mutationFn: (data: RegisterFormData) => authApi.register(data),
        onSuccess: ({ data, message }) => {
            setTokens(data.access);
            queryClient.invalidateQueries({ queryKey: ['me'] });
            notify.success(message);
            navigate('/profile');
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
        },
    });

    const googleAuthMutation = useMutation({
        mutationFn: (credential: string) => authApi.googleAuth(credential),
        onSuccess: ({ data, message }) => {
            setTokens(data.access);
            queryClient.invalidateQueries({ queryKey: ['me'] });
            notify.success(message);
            navigate('/profile');
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
        },
    });

    const logout = async () => {
        try {
            await authApi.logout();
        } catch (e) {
            console.log('logout error:', e);
        } finally {
            clearTokens();
            queryClient.clear();
            navigate('/login');
            notify.success('Logged out');
        }
    };

    const passwordReset = useMutation({
        mutationFn: (data: RequestPasswordResetFormData) =>
            authApi.requestPasswordReset(data),
        onSuccess: (data) => {
            notify.success(data.message);
        },
        onError: (error) => {
            notify.error(getErrorMessage(error));
        },
    });

    return {
        userAccount: meQuery.data?.data ?? userAccount,

        updateUserAccount: meMutation.mutate,
        isUpdatingUserAccount: meMutation.isPending,

        isAuthenticated: !!accessToken,
        isLoading: meQuery.isLoading,

        login: loginMutation.mutate,
        isLoggingIn: loginMutation.isPending,

        register: registerMutation.mutate,
        isRegistering: registerMutation.isPending,

        passwordReset: passwordReset.mutate,
        passwordResetPending: passwordReset.isPending,
        passwordResetSuccess: passwordReset.isSuccess,

        googleAuth: googleAuthMutation.mutate,
        isGoogleAuthPending: googleAuthMutation.isPending,

        logout,
    };
}

export function useCountries() {
    return useQuery({
        queryKey: ['countries'],
        queryFn: authApi.getCountries,
        retry: false,
        staleTime: 1000 * 60 * 5,
    });
}
