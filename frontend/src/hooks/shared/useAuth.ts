/**
 * Zustand store for authentication state and user profile.
 * Provides isAuthenticated, roles, profile, and loadUser().
 */
import { create } from "zustand";
import { getUser } from "../../services/shared/authService";
import type { UserProfile } from "../../types/auth";

interface AuthState {
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  roles: string[];
  profile: UserProfile | null;
  /** Loads user info from Keycloak and updates the store */
  loadUser: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  isAuthenticated: false,
  roles: [],
  profile: null,
  loadUser: async () => {
    const user = await getUser();
    set({
      isAuthenticated: !!user,
      roles: user?.roles || [],
      profile: user?.profile || null,
    });
  },
}));
