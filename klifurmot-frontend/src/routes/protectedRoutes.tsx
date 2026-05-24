import { useAuthStore } from '@/stores';
import { Navigate, Outlet } from 'react-router-dom';
import LoadingSpinner from '@/components/ui/loadingSpinner';

interface ProtectedRouteProps {
    requiredRole?: 'admin' | 'user';
}

export const ProtectedRoutes = ({ requiredRole }: ProtectedRouteProps) => {
    const { isAuthenticated, isInitializing, userAccount } = useAuthStore();

    if (isInitializing) return <LoadingSpinner />;

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole === 'admin' && userAccount?.is_admin === false) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};
