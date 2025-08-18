import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock dependencies
vi.mock("../indexeddb", () => ({
  offlineDB: {
    saveLoadingProgress: vi.fn(),
    saveQuestion: vi.fn(),
    saveQuestions: vi.fn(), // Add missing method
    saveCategory: vi.fn(),
    saveCategories: vi.fn(), // Add missing method
    saveAssessment: vi.fn(),
    saveAssessments: vi.fn(), // Add missing method
    saveResponse: vi.fn(),
    saveResponses: vi.fn(),
    saveSubmission: vi.fn(),
    saveSubmissions: vi.fn(), // Add missing method
    saveReport: vi.fn(),
    saveReports: vi.fn(), // Add missing method
    saveOrganization: vi.fn(),
    saveOrganizations: vi.fn(), // Add missing method
    saveUser: vi.fn(), // Added for calculateDerivedStats
    getAssessmentsByUser: vi.fn().mockResolvedValue([]), // Add missing method
    getAllOrganizations: vi.fn().mockResolvedValue([]),
    getAllUsers: vi.fn().mockResolvedValue([]), // Added for calculateDerivedStats
    getAllAssessments: vi.fn().mockResolvedValue([]), // Added for calculateDerivedStats
    getAllSubmissions: vi.fn().mockResolvedValue([]), // Added for calculateDerivedStats
    getAllCategories: vi.fn().mockResolvedValue([]), // Added for calculateDerivedStats
    getAllQuestions: vi.fn().mockResolvedValue([]), // Added for calculateDerivedStats
  },
}));

vi.mock("../dataTransformation", () => ({
  DataTransformationService: {
    transformQuestion: vi.fn((q) => ({ ...q, sync_status: "synced" })),
    transformCategory: vi.fn((c) => ({ ...c, sync_status: "synced" })),
    transformAssessment: vi.fn((a) => ({ ...a, sync_status: "synced" })),
    transformAssessmentsWithContext: vi.fn((assessments) =>
      assessments.map((a: any) => ({ ...a, sync_status: "synced" })),
    ),
    transformUsersWithContext: vi.fn((users, orgId) =>
      users.map((u: any) => ({ ...u, org_id: orgId, sync_status: "synced" })),
    ),
    transformSubmissionsWithContext: vi.fn((subs, orgId, email) =>
      subs.map((s: any) => ({
        ...s,
        org_id: orgId,
        user_email: email,
        sync_status: "synced",
      })),
    ),
    transformResponse: vi.fn((r) => ({ ...r, sync_status: "synced" })),
    transformSubmission: vi.fn((s) => ({ ...s, sync_status: "synced" })),
    transformReport: vi.fn((rep) => ({ ...rep, sync_status: "synced" })),
    transformOrganization: vi.fn((o) => ({ ...o, sync_status: "synced" })),
    validateTransformedData: vi.fn(() => true), // Add missing method
    calculateOrganizationStats: vi.fn(
      (org, users, assessments, submissions) => ({ ...org }),
    ),
    calculateUserStats: vi.fn((user, assessments, submissions) => ({
      ...user,
    })),
    calculateCategoryStats: vi.fn((category, questions) => ({ ...category })),
  },
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
    getUserReports: vi.fn().mockResolvedValue({ reports: [] }),
  },
  OrganizationsService: {
    getOrganizations: vi.fn().mockResolvedValue({ organizations: [] }),
    getAdminOrganizations: vi.fn().mockResolvedValue([]), // Add missing method
  },
  OrganizationMembersService: {
    getOrganizationsByIdMembers: vi.fn().mockResolvedValue([]),
    getOrganizationsByIdOrgAdminMembers: vi.fn().mockResolvedValue([]),
  },
}));

// Import after mocks
import { InitialDataLoader } from "../initialDataLoader";

describe("InitialDataLoader", () => {
  let dataLoader: InitialDataLoader;

  beforeEach(() => {
    vi.clearAllMocks();
    dataLoader = new InitialDataLoader();
  });

  describe("getLoadingConfig", () => {
    it("should configure loading for DGRV admin", () => {
      const userContext = {
        userId: "admin1",
        userEmail: "admin@example.com",
        roles: ["drgv_admin"],
        organizationId: "org1",
        organizationName: "Test Org",
      };

      const config = InitialDataLoader.getLoadingConfig(userContext);

      expect(config.loadQuestions).toBe(true);
      expect(config.loadCategories).toBe(true);
      expect(config.loadAssessments).toBe(false); // DGRV admin doesn't load assessments
      expect(config.loadOrganizations).toBe(true);
      expect(config.loadUsers).toBe(true);
    });

    it("should configure loading for org admin", () => {
      const userContext = {
        userId: "orgadmin1",
        userEmail: "orgadmin@example.com",
        roles: ["org_admin"],
        organizationId: "org1",
        organizationName: "Test Org",
      };

      const config = InitialDataLoader.getLoadingConfig(userContext);

      expect(config.loadQuestions).toBe(true);
      expect(config.loadCategories).toBe(true);
      expect(config.loadAssessments).toBe(true);
      expect(config.loadResponses).toBe(true);
      expect(config.loadSubmissions).toBe(true);
      expect(config.loadReports).toBe(true);
      expect(config.loadOrganizations).toBe(false);
      expect(config.loadUsers).toBe(true);
    });

    it("should configure loading for org user", () => {
      const userContext = {
        userId: "user1",
        userEmail: "user@example.com",
        roles: ["Org_User"],
        organizationId: "org1",
        organizationName: "Test Org",
      };

      const config = InitialDataLoader.getLoadingConfig(userContext);

      expect(config.loadQuestions).toBe(true);
      expect(config.loadCategories).toBe(true);
      expect(config.loadAssessments).toBe(true);
      expect(config.loadResponses).toBe(true);
      expect(config.loadSubmissions).toBe(true);
      expect(config.loadReports).toBe(true);
      expect(config.loadOrganizations).toBe(false);
      expect(config.loadUsers).toBe(false);
    });
  });

  describe("loadAllData", () => {
    it("should load data based on user role", async () => {
      const userContext = {
        userId: "user1",
        userEmail: "user@example.com",
        roles: ["org_admin"],
        organizationId: "org1",
        organizationName: "Test Org",
      };

      const { offlineDB } = await import("../indexeddb");
      const { QuestionsService } = await import(
        "@/openapi-rq/requests/services.gen"
      );
      const { CategoriesService } = await import(
        "@/openapi-rq/requests/services.gen"
      );

      vi.mocked(QuestionsService.getQuestions).mockResolvedValue({
        questions: [
          {
            question: {
              question_id: "q1",
              category: "test",
              latest_revision: {
                question_revision_id: "qr1",
                question_id: "q1",
                text: { en: "Test question" },
                weight: 5,
                created_at: "2024-01-01T00:00:00Z",
              },
              created_at: "2024-01-01T00:00:00Z",
            },
            revisions: [],
          },
        ],
      });

      vi.mocked(CategoriesService.getCategories).mockResolvedValue({
        categories: [
          {
            category_id: "c1",
            name: "Test",
            weight: 10,
            order: 1,
            template_id: "t1",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
      });

      await dataLoader.loadAllData(userContext);

      expect(offlineDB.saveLoadingProgress).toHaveBeenCalled();
      expect(QuestionsService.getQuestions).toHaveBeenCalled();
      expect(CategoriesService.getCategories).toHaveBeenCalled();
      expect(offlineDB.saveQuestions).toHaveBeenCalled();
      expect(offlineDB.saveCategories).toHaveBeenCalled();
    });

    it("should handle API errors gracefully", async () => {
      const userContext = {
        userId: "user1",
        userEmail: "user@example.com",
        roles: ["org_admin"],
        organizationId: "org1",
        organizationName: "Test Org",
      };

      const { QuestionsService } = await import(
        "@/openapi-rq/requests/services.gen"
      );
      vi.mocked(QuestionsService.getQuestions).mockRejectedValue(
        new Error("API Error"),
      );

      // Should not throw error
      await expect(dataLoader.loadAllData(userContext)).rejects.toThrow(
        "API Error",
      );
    });
  });

  describe("loadQuestionsAndCategories", () => {
    it("should load questions and categories successfully", async () => {
      const { QuestionsService } = await import(
        "@/openapi-rq/requests/services.gen"
      );
      const { CategoriesService } = await import(
        "@/openapi-rq/requests/services.gen"
      );
      const { offlineDB } = await import("../indexeddb");
      const { DataTransformationService } = await import(
        "../dataTransformation"
      );

      vi.mocked(QuestionsService.getQuestions).mockResolvedValue({
        questions: [
          {
            question: {
              question_id: "q1",
              category: "test",
              latest_revision: {
                question_revision_id: "qr1",
                question_id: "q1",
                text: { en: "Test question" },
                weight: 5,
                created_at: "2024-01-01T00:00:00Z",
              },
              created_at: "2024-01-01T00:00:00Z",
            },
            revisions: [],
          },
        ],
      });

      vi.mocked(CategoriesService.getCategories).mockResolvedValue({
        categories: [
          {
            category_id: "c1",
            name: "Test",
            weight: 10,
            order: 1,
            template_id: "t1",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
      });

      await dataLoader["loadQuestionsAndCategories"]();

      expect(QuestionsService.getQuestions).toHaveBeenCalled();
      expect(CategoriesService.getCategories).toHaveBeenCalled();
      expect(DataTransformationService.transformQuestion).toHaveBeenCalled();
      expect(DataTransformationService.transformCategory).toHaveBeenCalled();
      expect(offlineDB.saveQuestions).toHaveBeenCalled();
      expect(offlineDB.saveCategories).toHaveBeenCalled();
    });
  });

  describe("loadAssessments", () => {
    it("should load assessments for org users", async () => {
      const userContext = {
        userId: "user1",
        userEmail: "user@example.com",
        roles: ["org_admin"],
        organizationId: "org1",
        organizationName: "Test Org",
      };
      const { AssessmentsService } = await import(
        "@/openapi-rq/requests/services.gen"
      );
      const { offlineDB } = await import("../indexeddb");
      const { DataTransformationService } = await import(
        "../dataTransformation"
      );

      vi.mocked(AssessmentsService.getAssessments).mockResolvedValue({
        assessments: [
          {
            assessment_id: "a1",
            language: "en",
            org_id: "org1",
            name: "Test Assessment",
            status: "draft",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
      });

      await dataLoader["loadAssessments"](userContext);

      expect(AssessmentsService.getAssessments).toHaveBeenCalled();
      expect(
        DataTransformationService.transformAssessmentsWithContext,
      ).toHaveBeenCalled();
      expect(offlineDB.saveAssessments).toHaveBeenCalled();
    });
  });

  describe("loadOrganizations", () => {
    it("should load organizations for DGRV admins", async () => {
      const { OrganizationsService } = await import(
        "@/openapi-rq/requests/services.gen"
      );
      const { offlineDB } = await import("../indexeddb");
      const { DataTransformationService } = await import(
        "../dataTransformation"
      );

      vi.mocked(OrganizationsService.getAdminOrganizations).mockResolvedValue([
        { id: "org1", name: "Test Org" },
      ]);

      await dataLoader["loadOrganizations"]();

      expect(OrganizationsService.getAdminOrganizations).toHaveBeenCalled();
      expect(
        DataTransformationService.transformOrganization,
      ).toHaveBeenCalled();
      expect(offlineDB.saveOrganizations).toHaveBeenCalled();
    });
  });
});
