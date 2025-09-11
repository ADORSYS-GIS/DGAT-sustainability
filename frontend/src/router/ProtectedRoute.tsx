import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/shared/useAuth";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";
import React from "react";

interface ProtectedRouteProps {
  allowedRoles?: string[];
  requireOrganization?: boolean;
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  requireOrganization,
  children,
}) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Check if user has required roles
  const hasRequiredRole = React.useMemo(() => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (!user) return false;

    const allRoles = [
      ...(user.roles || []),
      ...(user.realm_access?.roles || []),
    ].map((r) => r.toLowerCase());

    return allowedRoles.some((role) => allRoles.includes(role.toLowerCase()));
  }, [user, allowedRoles]);

  // Show loading spinner while authentication state is being determined
  if (loading) {
    return <LoadingSpinner />;
  }

  // Redirect to home if not authenticated
  if (!isAuthenticated) {
    toast.error("Please log in to access this page.");
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  // Redirect to unauthorized page if user doesn't have required roles
  if (allowedRoles && allowedRoles.length > 0 && !hasRequiredRole) {
    toast.error("You don't have permission to access this page.");
    return <Navigate to="/unauthorized" replace />;
  }

  if (requireOrganization && !user?.organizations) {
    toast.error("You must be part of an organization to access this page.");
    return <Navigate to="/" replace />;
  }

  // Render the protected content
  return children ? <>{children}</> : <Outlet />;
};
