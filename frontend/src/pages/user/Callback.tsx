import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { handleCallback } from "../../services/shared/authService";
import { useAuth } from "../../hooks/shared/useAuth";
import { LoadingSpinner } from "../../components/shared/LoadingSpinner";

/**
 * Handles the callback from Keycloak after login, and updates the user state.
 */

export const Callback = () => {
  const { loadUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handle = async () => {
      console.log(
        "[Callback] Current path:",
        window.location.pathname +
          window.location.search +
          window.location.hash,
      );
      try {
        const user = await handleCallback();
        console.log("[Callback] handleCallback user:", user);
        await loadUser();
        const roles = user?.roles || [];
        console.log("[Callback] roles:", roles);
        if (roles.includes("DGRV_Admin")) {
          navigate("/admin");
        } else if (
          roles.includes("Org_User") ||
          roles.includes("Org_Admin") ||
          roles.includes("Org_Expert")
        ) {
          navigate("/dashboard");
        } else {
          navigate("/dashboard");
        }
      } catch (err) {
        console.error("[Callback] Error in handleCallback:", err);
        navigate("/");
      }
    };
    handle();
  }, [loadUser, navigate]);

  return <LoadingSpinner />;
};
