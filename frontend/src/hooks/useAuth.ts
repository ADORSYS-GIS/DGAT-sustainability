import { useState, useEffect, createContext, useContext } from "react";
import { User, AuthState } from "@/types/user";
import { authenticateUser, initializeDemo } from "@/services/dataService";

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  signup: (
    username: string,
    password: string,
    email: string,
    organizationName?: string,
  ) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const useAuthState = (): AuthContextType => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    loading: true,
  });

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Initialize demo data
        await initializeDemo();

        // Check for stored auth on mount
        const storedUser = localStorage.getItem("dgrv_user");
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            setAuthState({
              user,
              isAuthenticated: true,
              loading: false,
            });
          } catch (error) {
            localStorage.removeItem("dgrv_user");
            setAuthState((prev) => ({ ...prev, loading: false }));
          }
        } else {
          setAuthState((prev) => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        setAuthState((prev) => ({ ...prev, loading: false }));
      }
    };

    initAuth();
  }, []);

  const login = async (
    username: string,
    password: string,
  ): Promise<boolean> => {
    setAuthState((prev) => ({ ...prev, loading: true }));

    try {
      // Authenticate against IndexedDB
      const user = await authenticateUser(username, password);

      if (user) {
        const authUser: User = {
          id: user.userId,
          username: user.username,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
          organizationName: user.organizationName,
          firstName: user.firstName,
          lastName: user.lastName,
        };

        localStorage.setItem("dgrv_user", JSON.stringify(authUser));
        setAuthState({
          user: authUser,
          isAuthenticated: true,
          loading: false,
        });

        return true;
      } else {
        setAuthState((prev) => ({ ...prev, loading: false }));
        return false;
      }
    } catch (error) {
      console.error("Login failed:", error);
      setAuthState((prev) => ({ ...prev, loading: false }));
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("dgrv_user");
    setAuthState({
      user: null,
      isAuthenticated: false,
      loading: false,
    });
  };

  const signup = async (
    username: string,
    password: string,
    email: string,
    organizationName?: string,
  ): Promise<boolean> => {
    setAuthState((prev) => ({ ...prev, loading: true }));

    try {
      // Mock signup - in real implementation, this would create user in IndexedDB
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        username,
        email,
        role: "org_user",
        organizationId: "org_new",
        organizationName: organizationName || "New Cooperative",
        firstName: username.charAt(0).toUpperCase() + username.slice(1),
        lastName: "User",
      };

      localStorage.setItem("dgrv_user", JSON.stringify(mockUser));
      setAuthState({
        user: mockUser,
        isAuthenticated: true,
        loading: false,
      });

      return true;
    } catch (error) {
      setAuthState((prev) => ({ ...prev, loading: false }));
      return false;
    }
  };

  return {
    ...authState,
    login,
    logout,
    signup,
  };
};

export { AuthContext };
