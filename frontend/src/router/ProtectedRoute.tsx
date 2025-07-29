import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/shared/useAuth";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { toast } from "sonner";
import { useEffect, useState } from "react";

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { isAuthenticated, user, roles, loading } = useAuth();
  const [timeoutReached, setTimeoutReached] = useState(false);

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log("[ProtectedRoute] Loading timeout reached, redirecting to unauthorized");
        setTimeoutReached(true);
      }
    }, 3000); // 3 second timeout

    return () => clearTimeout(timeoutId);
  }, [loading]);

  console.log("[ProtectedRoute] isAuthenticated:", isAuthenticated);
  console.log("[ProtectedRoute] user:", user);
  console.log("[ProtectedRoute] roles:", roles);
  console.log("[ProtectedRoute] pathname:", window.location.pathname);

  // If timeout reached or not authenticated, redirect immediately
  if (timeoutReached || (!loading && !isAuthenticated)) {
    console.log("[ProtectedRoute] Not authenticated or timeout reached, redirecting to /unauthorized");
    return <Navigate to="/unauthorized" replace />;
  }

  // If still loading, show a quick loading state
  if (loading) {
    console.log("[ProtectedRoute] Auth loading, rendering spinner...");
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner text="Checking authentication..." />
      </div>
    );
  }

  // Role-based access control
  const isDrgvAdmin = roles.includes("drgv_admin");
  const isOrgAdmin = roles.includes("org_admin");
  const isOrgUser = roles.includes("Org_User");

  // Only drgv_admin can access /admin
  if (window.location.pathname.startsWith("/admin") && !isDrgvAdmin) {
    console.log(
      "[ProtectedRoute] Non-drgrv_admin trying to access /admin, redirecting to /unauthorized",
    );
    return <Navigate to="/unauthorized" replace />;
  }

  // Only org_admin and org_user can access /dashboard
  if (
    window.location.pathname.startsWith("/dashboard") &&
    !(isOrgAdmin || isOrgUser)
  ) {
    console.log(
      "[ProtectedRoute] Non-org_admin/org_user trying to access /dashboard, redirecting to /unauthorized",
    );
    return <Navigate to="/unauthorized" replace />;
  }

  // Show toast if no organisation
  if (
    !isDrgvAdmin &&
    (!user?.organizations || Object.keys(user.organizations).length === 0)
  ) {
    toast.error(
      "You need to be part of an organisation to start an assessment.",
    );
  }

  // If allowedRoles is provided, check roles (legacy support)
  if (allowedRoles && !allowedRoles.some((role) => roles.includes(role))) {
    console.log(
      "[ProtectedRoute] User missing allowedRoles, redirecting to /unauthorized",
    );
    return <Navigate to="/unauthorized" replace />;
  }

  console.log("[ProtectedRoute] Access granted, rendering Outlet");
  return <Outlet />;
};
