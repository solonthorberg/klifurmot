import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter } from 'react-router-dom';

import { Notifications } from '@/components/ui/notifications';
import Router from '@/routes/router';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useAuthStore } from './stores';
import { useEffect } from 'react';
import { authApi } from './api';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

function SilentRefresh() {
    const { setTokens, clearTokens, setInitialized } = useAuthStore();

    useEffect(() => {
        authApi
            .refreshToken()
            .then(({ data }) => setTokens(data.access))
            .catch(() => clearTokens())
            .finally(() => setInitialized());
    }, []);

    return null;
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function App() {
    return (
        <GoogleOAuthProvider clientId={CLIENT_ID}>
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <SilentRefresh />
                    <Notifications />
                    <Router />
                </BrowserRouter>
                <ReactQueryDevtools initialIsOpen={false} />
            </QueryClientProvider>
        </GoogleOAuthProvider>
    );
}
