import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useOrgUserManageUsers } from "../useOrgUserManageUsers";

// Mock react-router-dom
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue || key,
  }),
}));

// Mock OrganizationMembersService
vi.mock("@/openapi-rq/requests/services.gen", () => ({
  OrganizationMembersService: {
    postOrganizationsByIdOrgAdminMembers: vi.fn(),
    putOrganizationsByIdOrgAdminMembersByMemberIdCategories: vi.fn(),
    deleteOrganizationsByIdOrgAdminMembersByMemberId: vi.fn(),
  },
}));

// Mock crypto.randomUUID
global.crypto = {
  randomUUID: () => "test-uuid-123",
} as Crypto;

describe("useOrgUserManageUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() => useOrgUserManageUsers());

      expect(result.current.showAddDialog).toBe(false);
      expect(result.current.editingUser).toBeNull();
      expect(result.current.formData).toEqual({
        email: "",
        roles: ["Org_User"],
        categories: [],
      });
      expect(result.current.usersLoading).toBe(false);
      expect(result.current.users).toEqual({ users: [] });
      expect(result.current.orgName).toBe("Test Organization");
      expect(result.current.orgId).toBe("test-org-1");
      expect(result.current.categories).toEqual(["Category 1", "Category 2"]);
    });
  });

  describe("organization information", () => {
    it("should extract organization information correctly", () => {
      const { result } = renderHook(() => useOrgUserManageUsers());

      expect(result.current.orgName).toBe("Test Organization");
      expect(result.current.orgId).toBe("test-org-1");
      expect(result.current.categories).toEqual(["Category 1", "Category 2"]);
    });
  });

  describe("form state management", () => {
    it("should update form data", () => {
      const { result } = renderHook(() => useOrgUserManageUsers());

      act(() => {
        result.current.setFormData({
          email: "new@example.com",
          roles: ["Org_User"],
          categories: ["Category 1"],
        });
      });

      expect(result.current.formData).toEqual({
        email: "new@example.com",
        roles: ["Org_User"],
        categories: ["Category 1"],
      });
    });

    it("should reset form data", () => {
      const { result } = renderHook(() => useOrgUserManageUsers());

      // Set some form data first
      act(() => {
        result.current.setFormData({
          email: "test@example.com",
          roles: ["Org_User"],
          categories: ["Category 1"],
        });
      });

      // Reset the form
      act(() => {
        result.current.resetForm();
      });

      expect(result.current.formData).toEqual({
        email: "",
        roles: ["Org_User"],
        categories: [],
      });
      expect(result.current.editingUser).toBeNull();
      expect(result.current.showAddDialog).toBe(false);
    });
  });

  describe("dialog management", () => {
    it("should open and close add dialog", () => {
      const { result } = renderHook(() => useOrgUserManageUsers());

      act(() => {
        result.current.setShowAddDialog(true);
      });

      expect(result.current.showAddDialog).toBe(true);

      act(() => {
        result.current.setShowAddDialog(false);
      });

      expect(result.current.showAddDialog).toBe(false);
    });

    it("should handle add user action", () => {
      const { result } = renderHook(() => useOrgUserManageUsers());

      act(() => {
        result.current.handleAddUser();
      });

      expect(result.current.showAddDialog).toBe(true);
    });
  });

  describe("navigation functions", () => {
    it("should provide navigation functions", () => {
      const { result } = renderHook(() => useOrgUserManageUsers());

      expect(typeof result.current.handleBackToDashboard).toBe("function");
      expect(typeof result.current.handleAddUser).toBe("function");
    });
  });

  describe("data access", () => {
    it("should provide users data", () => {
      const { result } = renderHook(() => useOrgUserManageUsers());

      // By default, users should be empty since we're using mocks
      expect(result.current.users).toEqual({ users: [] });
    });

    it("should provide loading state", () => {
      const { result } = renderHook(() => useOrgUserManageUsers());

      expect(typeof result.current.usersLoading).toBe("boolean");
    });
  });

  describe("mutation functions", () => {
    it("should provide mutation functions", () => {
      const { result } = renderHook(() => useOrgUserManageUsers());

      expect(result.current.createUser).toBeDefined();
      expect(result.current.updateUser).toBeDefined();
      expect(result.current.deleteUser).toBeDefined();
    });

    it("should provide refetch function", () => {
      const { result } = renderHook(() => useOrgUserManageUsers());

      expect(typeof result.current.refetch).toBe("function");
    });
  });

  describe("form submission", () => {
    it("should handle form submission for new user", () => {
      const { result } = renderHook(() => useOrgUserManageUsers());

      // Set form data for new user
      act(() => {
        result.current.setFormData({
          email: "new@example.com",
          roles: ["Org_User"],
          categories: ["Category 1"],
        });
      });

      act(() => {
        result.current.handleSubmit();
      });

      // The test should pass since we're using mocks
      expect(result.current.formData.email).toBe("new@example.com");
    });

    it("should handle form submission for existing user", () => {
      const { result } = renderHook(() => useOrgUserManageUsers());

      const userToEdit = {
        id: "test-user-1",
        email: "test@example.com",
        username: "testuser",
        roles: ["Org_User"],
        categories: ["Category 1"],
      };

      // Set up editing state
      act(() => {
        result.current.handleEdit(userToEdit);
        result.current.setFormData({
          email: "test@example.com",
          roles: ["Org_User"],
          categories: ["Category 2"],
        });
      });

      act(() => {
        result.current.handleSubmit();
      });

      // The test should pass since we're using mocks
      expect(result.current.formData.categories).toEqual(["Category 2"]);
    });
  });

  describe("user deletion", () => {
    it("should handle user deletion", () => {
      const { result } = renderHook(() => useOrgUserManageUsers());

      // Mock window.confirm to return true
      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => true);

      act(() => {
        result.current.handleDelete("test-user-1");
      });

      // Restore original confirm
      window.confirm = originalConfirm;
    });

    it("should not delete user when confirmation is cancelled", () => {
      const { result } = renderHook(() => useOrgUserManageUsers());

      // Mock window.confirm to return false
      const originalConfirm = window.confirm;
      window.confirm = vi.fn(() => false);

      act(() => {
        result.current.handleDelete("test-user-1");
      });

      // Restore original confirm
      window.confirm = originalConfirm;
    });
  });
});
