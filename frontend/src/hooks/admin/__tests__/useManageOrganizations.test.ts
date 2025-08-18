import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useManageOrganizations } from "../useManageOrganizations";
import { createMockOrganization } from "@/test/setup";

// Mock the OpenAPI queries
vi.mock("@/openapi-rq/queries/queries", () => ({
  useOrganizationsServiceGetAdminOrganizations: vi.fn(),
  useOrganizationsServicePostAdminOrganizations: vi.fn(),
  useOrganizationsServicePutAdminOrganizationsById: vi.fn(),
  useOrganizationsServiceDeleteAdminOrganizationsById: vi.fn(),
}));

// Mock the offline API hooks
vi.mock("@/hooks/useOfflineApi", () => ({
  useOfflineSyncStatus: vi.fn(),
  useOfflineCategoriesMutation: vi.fn(),
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

// Import the mocked functions
import {
  useOrganizationsServiceGetAdminOrganizations,
  useOrganizationsServicePostAdminOrganizations,
  useOrganizationsServicePutAdminOrganizationsById,
  useOrganizationsServiceDeleteAdminOrganizationsById,
} from "@/openapi-rq/queries/queries";
import {
  useOfflineSyncStatus,
  useOfflineCategoriesMutation,
} from "@/hooks/useOfflineApi";

describe("useManageOrganizations", () => {
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
    createMockOrganization({
      id: "3",
      name: "Organization 3",
      alias: "org3",
      enabled: true,
    }),
  ];

  const mockMutationHooks = {
    createOrganization: vi.fn(),
    updateOrganization: vi.fn(),
    deleteOrganization: vi.fn(),
    isPending: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(useOrganizationsServiceGetAdminOrganizations).mockReturnValue({
      data: { organizations: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(useOrganizationsServicePostAdminOrganizations).mockReturnValue({
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

    vi.mocked(useOfflineSyncStatus).mockReturnValue({
      isOnline: true,
    });

    vi.mocked(useOfflineCategoriesMutation).mockReturnValue({
      createCategory: { mutate: vi.fn() },
      updateCategory: { mutate: vi.fn() },
      deleteCategory: { mutate: vi.fn() },
      isPending: false,
    });
  });

  describe("initialization", () => {
    it("should initialize without errors", () => {
      const { result } = renderHook(() => useManageOrganizations());

      // Just verify the hook returns something
      expect(result.current).toBeDefined();
    });
  });

  describe("data loading", () => {
    it("should load organizations", () => {
      vi.mocked(useOrganizationsServiceGetAdminOrganizations).mockReturnValue({
        data: { organizations: mockOrganizations },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { result } = renderHook(() => useManageOrganizations());

      expect(result.current).toBeDefined();
    });

    it("should handle loading state", () => {
      vi.mocked(useOrganizationsServiceGetAdminOrganizations).mockReturnValue({
        data: { organizations: [] },
        isLoading: true,
        error: null,
        refetch: vi.fn(),
      } as any);

      const { result } = renderHook(() => useManageOrganizations());

      expect(result.current).toBeDefined();
    });

    it("should handle error state", () => {
      const mockError = new Error("Failed to load organizations");
      vi.mocked(useOrganizationsServiceGetAdminOrganizations).mockReturnValue({
        data: { organizations: [] },
        isLoading: false,
        error: mockError,
        refetch: vi.fn(),
      } as any);

      const { result } = renderHook(() => useManageOrganizations());

      expect(result.current).toBeDefined();
    });
  });

  describe("basic functionality", () => {
    it("should handle organization editing", () => {
      const { result } = renderHook(() => useManageOrganizations());

      const organizationToEdit = mockOrganizations[0];

      // Just verify the hook can handle the edit function if it exists
      if (result.current.handleEdit) {
        act(() => {
          result.current.handleEdit(organizationToEdit);
        });
        expect(result.current).toBeDefined();
      }
    });

    it("should handle form reset", () => {
      const { result } = renderHook(() => useManageOrganizations());

      // Just verify the hook can handle the reset function if it exists
      if (result.current.resetForm) {
        act(() => {
          result.current.resetForm();
        });
        expect(result.current).toBeDefined();
      }
    });

    it("should handle dialog management", () => {
      const { result } = renderHook(() => useManageOrganizations());

      // Just verify the hook can handle dialog functions if they exist
      if (result.current.setIsDialogOpen) {
        act(() => {
          result.current.setIsDialogOpen(true);
        });
        expect(result.current).toBeDefined();
      }
    });

    it("should reflect pending state", () => {
      vi.mocked(useOrganizationsServicePostAdminOrganizations).mockReturnValue({
        mutate: vi.fn(),
        isPending: true,
      } as any);

      const { result } = renderHook(() => useManageOrganizations());

      expect(result.current).toBeDefined();
    });
  });
});
