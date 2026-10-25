import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, role: userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-madder border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const loginPath = role === 'artisan' ? '/artisan/login' : '/customer/login';
    return <Navigate to={loginPath} state={{ from: location.pathname }} replace />;
  }

  if (role && userRole !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}
