import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/shared/useAuth";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { ROLES } from "@/constants/roles";

export const Callback = () => {
  const { isAuthenticated, loading, roles, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      if (roles.includes(ROLES.ADMIN)) {
        navigate("/admin", { replace: true });
      } else if (
        [ROLES.ORG_USER, ROLES.ORG_ADMIN, ROLES.ORG_EXPERT].some((r) =>
          roles.includes(r),
        )
      ) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, loading, roles, navigate]);

  if (!loading && !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="mb-4 text-red-600 font-semibold">
          Authentication failed. Please try logging in again.
        </div>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={login}
        >
          Retry Login
        </button>
      </div>
    );
  }

  return <LoadingSpinner />;
};
