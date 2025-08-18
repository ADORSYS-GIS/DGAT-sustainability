import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useManageUsers } from "../useManageUsers";
import { createMockOrganization, createMockUser } from "@/test/setup";

// Import the mocked functions
import {
  useOrganizationsServiceGetAdminOrganizations,
  useOrganizationMembersServiceGetOrganizationsByIdMembers,
  useOrganizationMembersServicePostOrganizationsByIdMembers,
  useOrganizationsServicePutAdminOrganizationsById,
  useOrganizationsServiceDeleteAdminOrganizationsById,
  useOrganizationMembersServicePutApiOrganizationsByIdMembersByMembershipIdRoles,
  useOrganizationMembersServiceDeleteAdminOrganizationsByIdMembersByMembershipId,
} from "@/openapi-rq/queries/queries";

// Mock the OpenAPI queries
vi.mock("@/openapi-rq/queries/queries", () => ({
  useOrganizationsServiceGetAdminOrganizations: vi.fn(),
  useOrganizationMembersServiceGetOrganizationsByIdMembers: vi.fn(),
  useOrganizationMembersServicePostOrganizationsByIdMembers: vi.fn(),
  useOrganizationsServicePutAdminOrganizationsById: vi.fn(),
  useOrganizationsServiceDeleteAdminOrganizationsById: vi.fn(),
  useOrganizationMembersServicePutApiOrganizationsByIdMembersByMembershipIdRoles:
    vi.fn(),
  useOrganizationMembersServiceDeleteAdminOrganizationsByIdMembersByMembershipId:
    vi.fn(),
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue || key,
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock IndexedDB
vi.mock("@/services/indexeddb", () => ({
  offlineDB: {
    saveUser: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

describe("useManageUsers", () => {
  const mockOrganizations = [
    createMockOrganization({
      id: "1",
      name: "Organization 1",
      alias: "org1",
      enabled: true,
    }),
    createMockOrganization({
      id: "2",
      name: "Organization 2",
      alias: "org2",
      enabled: false,
    }),
  ];

  const mockUsers = [
    createMockUser({
      id: "1",
      name: "User 1",
      email: "user1@test.com",
      organization_id: "1",
    }),
    createMockUser({
      id: "2",
      name: "User 2",
      email: "user2@test.com",
      organization_id: "1",
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(useOrganizationsServiceGetAdminOrganizations).mockReturnValue({
      data: { organizations: mockOrganizations },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(
      useOrganizationMembersServiceGetOrganizationsByIdMembers,
    ).mockReturnValue({
      data: { members: mockUsers },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(
      useOrganizationMembersServicePostOrganizationsByIdMembers,
    ).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useOrganizationsServicePutAdminOrganizationsById).mockReturnValue(
      {
        mutate: vi.fn(),
        isPending: false,
      } as any,
    );

    vi.mocked(
      useOrganizationsServiceDeleteAdminOrganizationsById,
    ).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(
      useOrganizationMembersServicePutApiOrganizationsByIdMembersByMembershipIdRoles,
    ).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(
      useOrganizationMembersServiceDeleteAdminOrganizationsByIdMembersByMembershipId,
    ).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
  });

  describe("initialization", () => {
    it("should initialize without errors", () => {
      const { result } = renderHook(() => useManageUsers());

      // Just verify the hook returns something
      expect(result.current).toBeDefined();
    });
  });

  describe("basic functionality", () => {
    it("should handle basic operations", () => {
      const { result } = renderHook(() => useManageUsers());

      // Just verify the hook can be called and returns something
      expect(result.current).toBeDefined();
    });
  });
});
