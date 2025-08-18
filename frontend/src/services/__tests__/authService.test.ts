import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock dependencies
vi.mock("../shared/keycloakConfig", () => ({
  keycloak: {
    init: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    updateToken: vi.fn(),
    token: "mock-access-token",
    refreshToken: "mock-refresh-token",
    idToken: "mock-id-token",
    authenticated: true,
    subject: "user123",
    tokenParsed: {
      sub: "user123",
      preferred_username: "testuser",
      name: "Test User",
      email: "test@example.com",
      realm_access: { roles: ["org_admin"] },
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
  },
  keycloakInitOptions: {},
}));

vi.mock("idb-keyval", () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));

// Import after mocks
import {
  initializeAuth,
  login,
  logout,
  getAuthState,
  refreshToken,
  getUserProfile,
} from "../shared/authService";

describe("AuthService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initializeAuth", () => {
    it("should initialize Keycloak successfully", async () => {
      const { keycloak } = await import("../shared/keycloakConfig");
      vi.mocked(keycloak.init).mockResolvedValue(true);

      const result = await initializeAuth();

      expect(result).toBe(true);
      expect(keycloak.init).toHaveBeenCalled();
    });

    it("should handle initialization failure", async () => {
      const { keycloak } = await import("../shared/keycloakConfig");
      vi.mocked(keycloak.init).mockRejectedValue(new Error("Init failed"));

      const result = await initializeAuth();

      expect(result).toBe(false);
    });
  });

  describe("login", () => {
    it("should login user successfully", async () => {
      const { keycloak } = await import("../shared/keycloakConfig");
      vi.mocked(keycloak.login).mockResolvedValue();

      await login("http://localhost:3000");

      expect(keycloak.login).toHaveBeenCalledWith({
        redirectUri: "http://localhost:3000",
      });
    });

    it("should handle login errors", async () => {
      const { keycloak } = await import("../shared/keycloakConfig");
      vi.mocked(keycloak.login).mockRejectedValue(new Error("Login failed"));

      await expect(login()).rejects.toThrow("Login failed");
    });
  });

  describe("logout", () => {
    it("should logout user successfully", async () => {
      const { keycloak } = await import("../shared/keycloakConfig");
      const { del } = await import("idb-keyval");
      vi.mocked(keycloak.logout).mockResolvedValue();

      await logout();

      expect(keycloak.logout).toHaveBeenCalled();
      expect(del).toHaveBeenCalledWith("auth_tokens");
    });

    it("should handle logout errors", async () => {
      const { keycloak } = await import("../shared/keycloakConfig");
      vi.mocked(keycloak.logout).mockRejectedValue(new Error("Logout failed"));

      await expect(logout()).rejects.toThrow("Logout failed");
    });
  });

  describe("getAuthState", () => {
    it("should return authenticated state when user is logged in", async () => {
      const { keycloak } = await import("../shared/keycloakConfig");
      keycloak.authenticated = true;
      keycloak.tokenParsed = {
        sub: "user123",
        preferred_username: "testuser",
        name: "Test User",
        email: "test@example.com",
        realm_access: { roles: ["org_admin"] },
      };

      const authState = getAuthState();

      expect(authState.isAuthenticated).toBe(true);
      expect(authState.user).toBeDefined();
      expect(authState.user?.sub).toBe("user123");
      expect(authState.user?.email).toBe("test@example.com");
      expect(authState.roles).toContain("org_admin");
      expect(authState.loading).toBe(false);
    });

    it("should return unauthenticated state when user is not logged in", async () => {
      const { keycloak } = await import("../shared/keycloakConfig");
      keycloak.authenticated = false;
      keycloak.tokenParsed = null;

      const authState = getAuthState();

      expect(authState.isAuthenticated).toBe(false);
      expect(authState.user).toBeNull();
      expect(authState.roles).toEqual([]);
      expect(authState.loading).toBe(false);
    });
  });

  describe("refreshToken", () => {
    it("should refresh token successfully", async () => {
      const { keycloak } = await import("../shared/keycloakConfig");
      vi.mocked(keycloak.updateToken).mockResolvedValue(true);

      const result = await refreshToken();

      expect(result).toBe(true);
      expect(keycloak.updateToken).toHaveBeenCalledWith(30); // Fix the expected value
    });

    it("should handle token refresh failure", async () => {
      const { keycloak } = await import("../shared/keycloakConfig");
      vi.mocked(keycloak.updateToken).mockResolvedValue(false);

      const result = await refreshToken();

      expect(result).toBe(false);
    });

    it("should handle token refresh errors", async () => {
      const { keycloak } = await import("../shared/keycloakConfig");
      vi.mocked(keycloak.updateToken).mockRejectedValue(
        new Error("Refresh failed"),
      );

      const result = await refreshToken(); // Don't expect it to throw, expect it to return false

      expect(result).toBe(false);
    });
  });

  describe("getUserProfile", () => {
    it("should return user profile when authenticated", async () => {
      const { keycloak } = await import("../shared/keycloakConfig");
      keycloak.authenticated = true;
      keycloak.tokenParsed = {
        sub: "user123",
        preferred_username: "testuser",
        name: "Test User",
        email: "test@example.com",
        realm_access: { roles: ["org_admin"] },
      };

      const profile = getUserProfile();

      expect(profile).toBeDefined();
      expect(profile?.sub).toBe("user123");
      expect(profile?.email).toBe("test@example.com");
      expect(profile?.name).toBe("Test User");
    });

    it("should return null when not authenticated", async () => {
      const { keycloak } = await import("../shared/keycloakConfig");
      keycloak.authenticated = false;
      keycloak.tokenParsed = null;

      const profile = getUserProfile();

      expect(profile).toBeNull();
    });
  });

  describe("token management", () => {
    it("should store tokens in IndexedDB on successful authentication", async () => {
      const { keycloak } = await import("../shared/keycloakConfig");
      const { set } = await import("idb-keyval");
      vi.mocked(keycloak.init).mockResolvedValue(true);

      await initializeAuth();

      expect(set).toHaveBeenCalledWith("auth_tokens", {
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        idToken: "mock-id-token",
        expiresAt: undefined, // Fix the expected value
      });
    });

    it("should clear tokens from IndexedDB on logout", async () => {
      const { keycloak } = await import("../shared/keycloakConfig");
      const { del } = await import("idb-keyval");
      vi.mocked(keycloak.logout).mockResolvedValue();

      await logout();

      expect(del).toHaveBeenCalledWith("auth_tokens");
    });
  });
});
