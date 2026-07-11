import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

type UserRole = 'customer_admin' | 'customer' | 'support_agent' | 'support_manager' | 'executor' | 'admin';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  '/my-company': ['customer', 'customer_admin'],
  '/invitations': ['support_agent', 'support_manager', 'executor', 'admin'],
  '/products': ['support_agent', 'support_manager', 'executor', 'admin'],
  '/products/new': ['support_agent', 'support_manager', 'executor', 'admin'],
  '/tasks': ['support_agent', 'support_manager', 'executor', 'admin'],
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const requiredRoles = ROUTE_PERMISSIONS[location.pathname];

  if (requiredRoles && user && !requiredRoles.includes(user.role as UserRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

