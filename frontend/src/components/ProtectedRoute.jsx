import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loading } from './ui';

export default function ProtectedRoute({ organizerOnly = false }) {
  const { isAuthenticated, isOrganizer, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loading text="Verificando sesión..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (organizerOnly && !isOrganizer) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
