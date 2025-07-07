import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/shared/useAuth";

interface ProtectedRouteProps {
  allowedRoles: string[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, roles } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.some((role) => roles.includes(role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
