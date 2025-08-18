import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock dependencies
vi.mock("../indexeddb", () => ({
  offlineDB: {
    getAllQuestions: vi.fn().mockResolvedValue([]),
    getAllCategories: vi.fn().mockResolvedValue([]),
    getAllAssessments: vi.fn().mockResolvedValue([]),
    getResponsesWithFilters: vi.fn().mockResolvedValue([]),
    getAllSubmissions: vi.fn().mockResolvedValue([]),
    getAllReports: vi.fn().mockResolvedValue([]),
    getAllOrganizations: vi.fn().mockResolvedValue([]),
    saveQuestion: vi.fn(),
    saveCategory: vi.fn(),
    saveAssessment: vi.fn(),
    saveResponse: vi.fn(),
    saveSubmission: vi.fn(),
    saveReport: vi.fn(),
    saveOrganization: vi.fn(),
  },
}));

vi.mock("../dataTransformation", () => ({
  DataTransformationService: {
    transformQuestion: vi.fn((q) => ({ ...q, sync_status: "synced" })),
    transformCategory: vi.fn((c) => ({ ...c, sync_status: "synced" })),
    transformAssessment: vi.fn((a) => ({ ...a, sync_status: "synced" })),
    transformResponse: vi.fn((r) => ({ ...r, sync_status: "synced" })),
    transformSubmission: vi.fn((s) => ({ ...s, sync_status: "synced" })),
    transformReport: vi.fn((rep) => ({ ...rep, sync_status: "synced" })),
    transformOrganization: vi.fn((o) => ({ ...o, sync_status: "synced" })),
  },
}));

vi.mock("../shared/authService", () => ({
  getAuthState: vi.fn(() => ({
    isAuthenticated: true,
    roles: ["org_admin"],
    user: { sub: "user1", email: "user@example.com" },
  })),
}));

vi.mock("@/openapi-rq/requests/services.gen", () => ({
  QuestionsService: {
    getQuestions: vi.fn().mockResolvedValue({ questions: [] }),
  },
  CategoriesService: {
    getCategories: vi.fn().mockResolvedValue({ categories: [] }),
  },
  AssessmentsService: {
    getAssessments: vi.fn().mockResolvedValue({ assessments: [] }),
  },
  ResponsesService: {
    getResponses: vi.fn().mockResolvedValue({ responses: [] }),
  },
  SubmissionsService: {
    getSubmissions: vi.fn().mockResolvedValue({ submissions: [] }),
  },
  ReportsService: {
    getReports: vi.fn().mockResolvedValue({ reports: [] }),
  },
  OrganizationsService: {
    getOrganizations: vi.fn().mockResolvedValue({ organizations: [] }),
  },
}));

// Mock window events
const mockAddEventListener = vi.fn();
Object.defineProperty(window, "addEventListener", {
  value: mockAddEventListener,
  writable: true,
});

// Mock navigator.onLine
Object.defineProperty(navigator, "onLine", {
  writable: true,
  value: true,
});

// Import after mocks
import { SyncService } from "../syncService";

describe("SyncService", () => {
  let syncService: SyncService;

  beforeEach(() => {
    vi.clearAllMocks();
    syncService = new SyncService();
  });

  describe("initialization", () => {
    it("should setup network listeners on construction", () => {
      expect(mockAddEventListener).toHaveBeenCalledWith(
        "online",
        expect.any(Function),
      );
      expect(mockAddEventListener).toHaveBeenCalledWith(
        "offline",
        expect.any(Function),
      );
    });
  });

  describe("isCurrentlySyncing", () => {
    it("should return false when not syncing", () => {
      expect(syncService.isCurrentlySyncing()).toBe(false);
    });
  });

  describe("performFullSync", () => {
    it("should return empty result when offline", async () => {
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: false,
      });

      const result = await syncService.performFullSync();

      expect(result.questions.added).toBe(0);
      expect(result.categories.added).toBe(0);
      expect(result.assessments.added).toBe(0);
    });

    it("should return empty result when already syncing", async () => {
      // Start a sync to set isSyncing to true
      const syncPromise = syncService.performFullSync();

      // Try another sync while first is running
      const result = await syncService.performFullSync();

      expect(result.questions.added).toBe(0);

      // Wait for first sync to complete
      await syncPromise;
    });

    it("should return empty result when not authenticated", async () => {
      const { getAuthState } = await import("../shared/authService");
      vi.mocked(getAuthState).mockReturnValue({
        isAuthenticated: false,
        roles: [],
        user: null,
      });

      const result = await syncService.performFullSync();

      expect(result.questions.added).toBe(0);
    });
  });

  describe("syncQuestions", () => {
    it("should sync questions successfully", async () => {
      const { QuestionsService } = await import(
        "@/openapi-rq/requests/services.gen"
      );
      const { offlineDB } = await import("../indexeddb");
      const { DataTransformationService } = await import(
        "../dataTransformation"
      );

      vi.mocked(QuestionsService.getQuestions).mockResolvedValue({
        questions: [{ question_id: "q1", category: "test" }],
      });

      const result = await syncService["syncQuestions"]();

      expect(result.added).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(DataTransformationService.transformQuestion).toHaveBeenCalled();
      expect(offlineDB.saveQuestion).toHaveBeenCalled();
    });

    it("should handle API errors gracefully", async () => {
      const { QuestionsService } = await import(
        "@/openapi-rq/requests/services.gen"
      );
      vi.mocked(QuestionsService.getQuestions).mockRejectedValue(
        new Error("API Error"),
      );

      const result = await syncService["syncQuestions"]();

      expect(result.added).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("API Error");
    });
  });

  describe("syncCategories", () => {
    it("should sync categories successfully", async () => {
      const { CategoriesService } = await import(
        "@/openapi-rq/requests/services.gen"
      );
      const { offlineDB } = await import("../indexeddb");
      const { DataTransformationService } = await import(
        "../dataTransformation"
      );

      vi.mocked(CategoriesService.getCategories).mockResolvedValue({
        categories: [{ category_id: "c1", name: "Test" }],
      });

      const result = await syncService["syncCategories"]();

      expect(result.added).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(DataTransformationService.transformCategory).toHaveBeenCalled();
      expect(offlineDB.saveCategory).toHaveBeenCalled();
    });
  });

  describe("role-based sync", () => {
    it("should sync different data based on user role", async () => {
      const { getAuthState } = await import("../shared/authService");

      // Test DGRV admin role
      vi.mocked(getAuthState).mockReturnValue({
        isAuthenticated: true,
        roles: ["drgv_admin"],
        user: { sub: "admin1", email: "admin@example.com" },
      });

      const result = await syncService.performFullSync();

      // DGRV admin should sync organizations and users
      expect(result.organizations.added).toBe(0);
      expect(result.users.added).toBe(0);
    });
  });
});
