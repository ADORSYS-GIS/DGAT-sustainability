import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/shared/useAuth";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user, roles, loading } = useAuth();

  console.log("[ProtectedRoute] isAuthenticated:", isAuthenticated);
  console.log("[ProtectedRoute] user:", user);
  console.log("[ProtectedRoute] roles:", roles);
  console.log("[ProtectedRoute] pathname:", window.location.pathname);

  if (loading) {
    console.log("[ProtectedRoute] Auth loading, rendering spinner...");
    return <LoadingSpinner text="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    console.log("[ProtectedRoute] Not authenticated, redirecting to /");
    return <Navigate to="/" replace />;
  }

  // Only block non-admins from /admin, but let the admin through
  if (
    window.location.pathname.startsWith("/admin") &&
    user?.email !== "tchikayaline@gmail.com"
  ) {
    console.log("[ProtectedRoute] Non-admin trying to access /admin, redirecting to /");
    return <Navigate to="/" replace />;
  }

  // Normal user: must have organisation field
  if (user?.email !== "tchikayaline@gmail.com" && !user?.organisation) {
    console.log("[ProtectedRoute] User missing organisation, redirecting to /no-organisation");
    return <Navigate to="/no-organisation" replace />;
  }

  // If allowedRoles is provided, check roles (legacy support)
  if (allowedRoles && !allowedRoles.some((role) => roles.includes(role))) {
    console.log("[ProtectedRoute] User missing allowedRoles, redirecting to /unauthorized");
    return <Navigate to="/unauthorized" replace />;
  }

  console.log("[ProtectedRoute] Access granted, rendering Outlet");
  return <Outlet />;
};
