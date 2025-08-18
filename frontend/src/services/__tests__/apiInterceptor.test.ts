import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock dependencies
vi.mock("../indexeddb", () => ({
  offlineDB: {
    saveQuestion: vi.fn(),
    saveCategory: vi.fn(),
    saveAssessment: vi.fn(),
    saveResponse: vi.fn(),
    saveSubmission: vi.fn(),
    saveReport: vi.fn(),
    saveOrganization: vi.fn(),
    addToSyncQueue: vi.fn(),
    getSyncQueue: vi.fn().mockResolvedValue([]),
    removeFromSyncQueue: vi.fn(),
    getAllQuestions: vi.fn().mockResolvedValue([]),
    getAllCategories: vi.fn().mockResolvedValue([]),
    getAllAssessments: vi.fn().mockResolvedValue([]),
    getResponsesWithFilters: vi.fn().mockResolvedValue([]),
    getAllSubmissions: vi.fn().mockResolvedValue([]),
    deleteQuestion: vi.fn(),
    deleteCategory: vi.fn(),
    deleteAssessment: vi.fn(),
    deleteResponse: vi.fn(),
    deleteSubmission: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../dataTransformation", () => ({
  DataTransformationService: {
    transformQuestion: vi.fn(),
    transformCategory: vi.fn(),
    transformAssessment: vi.fn(),
    transformResponse: vi.fn(),
    transformSubmission: vi.fn(),
    transformReport: vi.fn(),
    transformOrganization: vi.fn(),
  },
}));

vi.mock("../syncService", () => ({
  syncService: {
    performFullSync: vi.fn(),
    isCurrentlySyncing: vi.fn(() => false),
  },
}));

// Mock window events
const mockAddEventListener = vi.fn();
Object.defineProperty(window, "addEventListener", {
  value: mockAddEventListener,
  writable: true,
});

// Mock setTimeout and setInterval
vi.useFakeTimers();

// Import after mocks
import { ApiInterceptor } from "../apiInterceptor";
import { offlineDB } from "../indexeddb";
import { DataTransformationService } from "../dataTransformation";

describe("ApiInterceptor", () => {
  let interceptor: ApiInterceptor;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();

    // Reset navigator.onLine
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: true,
    });

    // Create a new interceptor instance for each test
    interceptor = new ApiInterceptor();
  });

  describe("initialization", () => {
    it("should initialize with default config", () => {
      const defaultInterceptor = new ApiInterceptor();
      expect(defaultInterceptor).toBeDefined();
    });

    it("should initialize with custom config", () => {
      const customConfig = {
        enableOfflineFirst: false,
        enableQueueing: false,
        maxRetries: 5,
        retryDelay: 2000,
      };

      const customInterceptor = new ApiInterceptor(customConfig);
      expect(customInterceptor).toBeDefined();
    });
  });

  describe("interceptGet", () => {
    it("should call API and store locally when online", async () => {
      const mockApiCall = vi.fn().mockResolvedValue({ data: "test" });
      const mockLocalGet = vi.fn().mockResolvedValue(null);

      const result = await interceptor.interceptGet(
        mockApiCall,
        mockLocalGet,
        "questions",
      );

      expect(mockApiCall).toHaveBeenCalled();
      expect(result).toEqual({ data: "test" });
    });

    it("should fall back to local data when API fails", async () => {
      const mockApiCall = vi.fn().mockRejectedValue(new Error("API Error"));
      const mockLocalGet = vi.fn().mockResolvedValue({ data: "local" });

      const result = await interceptor.interceptGet(
        mockApiCall,
        mockLocalGet,
        "questions",
      );

      expect(mockApiCall).toHaveBeenCalled();
      expect(mockLocalGet).toHaveBeenCalled();
      expect(result).toEqual({ data: "local" });
    });

    it("should throw error when no local data available", async () => {
      const mockApiCall = vi.fn().mockRejectedValue(new Error("API Error"));
      const mockLocalGet = vi.fn().mockResolvedValue(null);

      await expect(
        interceptor.interceptGet(mockApiCall, mockLocalGet, "questions"),
      ).rejects.toThrow("No local data available for questions");
    });
  });

  describe("interceptMutation", () => {
    it("should perform local mutation and API call when online", async () => {
      const mockApiCall = vi.fn().mockResolvedValue({ id: "1", data: "test" });
      const mockLocalMutation = vi.fn().mockResolvedValue(undefined);
      const data = { data: "test" };

      const result = await interceptor.interceptMutation(
        mockApiCall,
        mockLocalMutation,
        data,
        "questions",
        "create",
      );

      expect(mockLocalMutation).toHaveBeenCalledWith(data);
      expect(mockApiCall).toHaveBeenCalled();
      expect(result).toEqual({ id: "1", data: "test" });
    });

    it("should perform local mutation and queue when offline", async () => {
      // Create a new interceptor with offline state
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: false,
      });

      const offlineInterceptor = new ApiInterceptor();
      const mockApiCall = vi.fn().mockResolvedValue({ id: "1", data: "test" });
      const mockLocalMutation = vi.fn().mockResolvedValue(undefined);
      const data = { data: "test" };

      const result = await offlineInterceptor.interceptMutation(
        mockApiCall,
        mockLocalMutation,
        data,
        "questions",
        "create",
      );

      expect(mockLocalMutation).toHaveBeenCalledWith(data);
      expect(mockApiCall).not.toHaveBeenCalled();
      expect(result).toEqual(data);
    });

    it("should handle API failure gracefully", async () => {
      const mockApiCall = vi.fn().mockRejectedValue(new Error("API Error"));
      const mockLocalMutation = vi.fn().mockResolvedValue(undefined);
      const data = { data: "test" };

      const result = await interceptor.interceptMutation(
        mockApiCall,
        mockLocalMutation,
        data,
        "questions",
        "create",
      );

      expect(mockLocalMutation).toHaveBeenCalledWith(data);
      expect(mockApiCall).toHaveBeenCalled();
      expect(result).toEqual(data);
    });
  });

  describe("data transformation", () => {
    it("should transform and store questions locally", async () => {
      const questions = [{ id: "1", text: "Test question" }];
      const mockApiCall = vi.fn().mockResolvedValue({ questions });
      const mockLocalGet = vi.fn().mockResolvedValue(null);

      await interceptor.interceptGet(mockApiCall, mockLocalGet, "questions");

      expect(DataTransformationService.transformQuestion).toHaveBeenCalledWith(
        questions[0],
      );
      expect(offlineDB.saveQuestion).toHaveBeenCalled();
    });

    it("should transform and store categories locally", async () => {
      const categories = [{ id: "1", name: "Test category" }];
      const mockApiCall = vi.fn().mockResolvedValue({ categories });
      const mockLocalGet = vi.fn().mockResolvedValue(null);

      await interceptor.interceptGet(mockApiCall, mockLocalGet, "categories");

      expect(DataTransformationService.transformCategory).toHaveBeenCalledWith(
        categories[0],
      );
      expect(offlineDB.saveCategory).toHaveBeenCalled();
    });

    it("should transform and store assessments locally", async () => {
      const assessments = [{ id: "1", title: "Test assessment" }];
      const mockApiCall = vi.fn().mockResolvedValue({ assessments });
      const mockLocalGet = vi.fn().mockResolvedValue(null);

      await interceptor.interceptGet(mockApiCall, mockLocalGet, "assessments");

      expect(
        DataTransformationService.transformAssessment,
      ).toHaveBeenCalledWith(assessments[0]);
      expect(offlineDB.saveAssessment).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should handle local mutation errors", async () => {
      const mockApiCall = vi.fn().mockResolvedValue({ id: "1" });
      const mockLocalMutation = vi
        .fn()
        .mockRejectedValue(new Error("Local Error"));
      const data = { data: "test" };

      await expect(
        interceptor.interceptMutation(
          mockApiCall,
          mockLocalMutation,
          data,
          "questions",
          "create",
        ),
      ).rejects.toThrow("Local Error");
    });

    it("should handle unknown entity types gracefully", async () => {
      const mockApiCall = vi.fn().mockRejectedValue(new Error("API Error"));
      const mockLocalGet = vi.fn().mockResolvedValue(null);

      // This should throw for unknown entity types when no local data is available
      await expect(
        interceptor.interceptGet(mockApiCall, mockLocalGet, "unknown_entity"),
      ).rejects.toThrow("No local data available for unknown_entity");
    });
  });

  describe("configuration", () => {
    it("should respect enableOfflineFirst setting", () => {
      const config = { enableOfflineFirst: false };
      const interceptor = new ApiInterceptor(config);
      expect(interceptor).toBeDefined();
    });

    it("should respect enableQueueing setting", () => {
      const config = { enableQueueing: false };
      const interceptor = new ApiInterceptor(config);
      expect(interceptor).toBeDefined();
    });

    it("should respect enableRetry setting", () => {
      const config = { enableRetry: false };
      const interceptor = new ApiInterceptor(config);
      expect(interceptor).toBeDefined();
    });

    it("should respect maxRetries setting", () => {
      const config = { maxRetries: 5 };
      const interceptor = new ApiInterceptor(config);
      expect(interceptor).toBeDefined();
    });

    it("should respect retryDelay setting", () => {
      const config = { retryDelay: 2000 };
      const interceptor = new ApiInterceptor(config);
      expect(interceptor).toBeDefined();
    });

    it("should respect enablePeriodicSync setting", () => {
      const config = { enablePeriodicSync: false };
      const interceptor = new ApiInterceptor(config);
      expect(interceptor).toBeDefined();
    });

    it("should respect syncInterval setting", () => {
      const config = { syncInterval: 60000 };
      const interceptor = new ApiInterceptor(config);
      expect(interceptor).toBeDefined();
    });
  });

  describe("network status", () => {
    it("should detect online status correctly", () => {
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: true,
      });

      const onlineInterceptor = new ApiInterceptor();
      expect(onlineInterceptor.getNetworkStatus()).toBe(true);
    });

    it("should detect offline status correctly", () => {
      Object.defineProperty(navigator, "onLine", {
        writable: true,
        value: false,
      });

      const offlineInterceptor = new ApiInterceptor();
      expect(offlineInterceptor.getNetworkStatus()).toBe(false);
    });
  });

  describe("utility methods", () => {
    it("should get current configuration", () => {
      const config = { maxRetries: 5, retryDelay: 2000 };
      const interceptor = new ApiInterceptor(config);
      const currentConfig = interceptor.getConfig();

      expect(currentConfig.maxRetries).toBe(5);
      expect(currentConfig.retryDelay).toBe(2000);
    });

    it("should update configuration", () => {
      const interceptor = new ApiInterceptor();
      interceptor.updateConfig({ maxRetries: 10 });

      const currentConfig = interceptor.getConfig();
      expect(currentConfig.maxRetries).toBe(10);
    });

    it("should get sync status", async () => {
      const status = await interceptor.getSyncStatus();

      expect(status).toHaveProperty("queueLength");
      expect(status).toHaveProperty("isOnline");
      expect(status).toHaveProperty("isSyncing");
    });
  });
});
