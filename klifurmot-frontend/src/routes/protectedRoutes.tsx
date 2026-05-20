import { useAuthStore } from "@/stores";
import { Navigate, Outlet } from "react-router-dom";

interface ProtectedRouteProps {
    requiredRole?: 'admin' | 'user';
}

export const ProtectedRoutes = ({ requiredRole }: ProtectedRouteProps) => {
    const { isAuthenticated, userAccount } = useAuthStore();

    if (!isAuthenticated) {
        return <Navigate to='/login' replace />
    }

    if (requiredRole === 'admin' && userAccount?.is_admin === false) {
        return <Navigate to='/login' replace />
    }

    return <Outlet />
}
