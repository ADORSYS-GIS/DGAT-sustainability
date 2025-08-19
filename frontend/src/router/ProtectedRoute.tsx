import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/shared/useAuth";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";
import React from "react";

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  roles,
  children,
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  // Check if user has required roles
  const hasRequiredRole = React.useMemo(() => {
    if (!roles || roles.length === 0) return true;
    if (!user) return false;

    const allRoles = [
      ...(user.roles || []),
      ...(user.realm_access?.roles || []),
    ].map((r) => r.toLowerCase());

    return roles.some((role) => allRoles.includes(role.toLowerCase()));
  }, [user, roles]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (roles && roles.length > 0 && !hasRequiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
