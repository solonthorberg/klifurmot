import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { authApi, getErrorMessage } from '@/api/Index';
import { useAuthStore } from '@/stores/Index';
import { notify } from '@/stores/notificationStore';
import type { LoginRequest, RegisterRequest } from '@/types/Index';

export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    accessToken,
    refreshToken,
    setTokens,
    clearTokens,
    setUser,
    user,
    isAuthenticated,
  } = useAuthStore();

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: authApi.getMe,
    enabled: !!accessToken,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: (data) => {
      setTokens(data.access, data.refresh);
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      notify.success('Logged in successfully');
      navigate('/');
    },
    onError: (error) => {
      notify.error(getErrorMessage(error));
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterRequest) => authApi.register(data),
    onSuccess: () => {
      notify.success('Registration successful! Please log in.');
      navigate('/login');
    },
    onError: (error) => {
      notify.error(getErrorMessage(error));
    },
  });

  const googleAuthMutation = useMutation({
    mutationFn: (credential: string) => authApi.googleAuth(credential),
    onSuccess: (data) => {
      setTokens(data.access, data.refresh);
      setUser(data.user);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      notify.success('Logged in with Google');
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
    user: meQuery.data?.user ?? user,
    profile: meQuery.data?.profile,
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
