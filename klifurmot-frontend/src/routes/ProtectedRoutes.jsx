// routes/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isLoggedIn, isAdmin, loading } = useAuth();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to unauthorized page if admin is required but user is not admin
  if (requireAdmin && !isAdmin) {
    console.log('Admin required but user is not admin:', { isAdmin, isLoggedIn });
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;