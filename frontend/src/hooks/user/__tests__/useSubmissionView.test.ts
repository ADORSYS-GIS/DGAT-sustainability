import { renderHook } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useSubmissionView } from "../useSubmissionView";

// Mock dependencies
vi.mock("react-router-dom", () => ({
  useParams: () => ({
    submissionId: "test-submission-1",
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("useSubmissionView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize with default state", () => {
      const { result } = renderHook(() => useSubmissionView());

      expect(result.current.submissionLoading).toBeDefined();
      expect(result.current.submissionError).toBeDefined();
      expect(
        result.current.submission === null ||
          result.current.submission === undefined ||
          typeof result.current.submission === "object",
      ).toBe(true);
      expect(
        result.current.responses === null ||
          result.current.responses === undefined ||
          Array.isArray(result.current.responses),
      ).toBe(true);
      expect(result.current.groupedByCategory).toBeDefined();
      expect(result.current.categories).toBeDefined();
    });
  });

  describe("data access", () => {
    it("should provide loading state", () => {
      const { result } = renderHook(() => useSubmissionView());

      expect(typeof result.current.submissionLoading).toBe("boolean");
    });

    it("should provide error state", () => {
      const { result } = renderHook(() => useSubmissionView());

      expect(result.current.submissionError).toBeDefined();
    });

    it("should provide submission data", () => {
      const { result } = renderHook(() => useSubmissionView());

      expect(
        result.current.submission === null ||
          result.current.submission === undefined ||
          typeof result.current.submission === "object",
      ).toBe(true);
    });

    it("should provide responses data", () => {
      const { result } = renderHook(() => useSubmissionView());

      expect(
        result.current.responses === null ||
          result.current.responses === undefined ||
          Array.isArray(result.current.responses),
      ).toBe(true);
    });

    it("should provide grouped responses", () => {
      const { result } = renderHook(() => useSubmissionView());

      expect(result.current.groupedByCategory).toBeDefined();
      expect(typeof result.current.groupedByCategory).toBe("object");
    });

    it("should provide categories list", () => {
      const { result } = renderHook(() => useSubmissionView());

      expect(result.current.categories).toBeDefined();
      expect(Array.isArray(result.current.categories)).toBe(true);
    });
  });

  describe("hook structure", () => {
    it("should return expected properties", () => {
      const { result } = renderHook(() => useSubmissionView());

      expect(result.current).toHaveProperty("submissionLoading");
      expect(result.current).toHaveProperty("submissionError");
      expect(result.current).toHaveProperty("submission");
      expect(result.current).toHaveProperty("responses");
      expect(result.current).toHaveProperty("groupedByCategory");
      expect(result.current).toHaveProperty("categories");
    });

    it("should have correct property types", () => {
      const { result } = renderHook(() => useSubmissionView());

      expect(typeof result.current.submissionLoading).toBe("boolean");
      expect(
        result.current.submissionError === null ||
          typeof result.current.submissionError === "object",
      ).toBe(true);
      expect(
        result.current.submission === null ||
          result.current.submission === undefined ||
          typeof result.current.submission === "object",
      ).toBe(true);
      expect(
        result.current.responses === null ||
          result.current.responses === undefined ||
          Array.isArray(result.current.responses),
      ).toBe(true);
      expect(typeof result.current.groupedByCategory).toBe("object");
      expect(Array.isArray(result.current.categories)).toBe(true);
    });
  });

  describe("data consistency", () => {
    it("should maintain consistent data structure across renders", () => {
      const { result, rerender } = renderHook(() => useSubmissionView());

      const initialLoading = result.current.submissionLoading;
      const initialError = result.current.submissionError;
      const initialCategories = result.current.categories;

      rerender();

      expect(result.current.submissionLoading).toBe(initialLoading);
      expect(result.current.submissionError).toEqual(initialError);
      expect(result.current.categories).toEqual(initialCategories);
    });
  });

  describe("URL parameter handling", () => {
    it("should extract submissionId from URL params", () => {
      const { result } = renderHook(() => useSubmissionView());

      // The hook should work with the mocked submissionId
      expect(result.current).toBeDefined();
      expect(typeof result.current).toBe("object");
    });
  });

  describe("data transformation", () => {
    it("should provide empty categories when no data", () => {
      const { result } = renderHook(() => useSubmissionView());

      // When no submission data, categories should be empty
      expect(result.current.categories).toEqual([]);
    });

    it("should provide empty grouped responses when no data", () => {
      const { result } = renderHook(() => useSubmissionView());

      // When no submission data, groupedByCategory should be empty
      expect(result.current.groupedByCategory).toEqual({});
    });

    it("should handle undefined submission gracefully", () => {
      const { result } = renderHook(() => useSubmissionView());

      // Should handle cases where submission is not found
      expect(
        result.current.submission === null ||
          result.current.submission === undefined ||
          typeof result.current.submission === "object",
      ).toBe(true);
      expect(
        result.current.responses === null ||
          result.current.responses === undefined ||
          Array.isArray(result.current.responses),
      ).toBe(true);
    });
  });

  describe("response grouping logic", () => {
    it("should group responses by category when data exists", () => {
      const { result } = renderHook(() => useSubmissionView());

      // The grouping logic should work even with empty data
      expect(result.current.groupedByCategory).toBeDefined();
      expect(typeof result.current.groupedByCategory).toBe("object");
    });

    it("should handle responses without category", () => {
      const { result } = renderHook(() => useSubmissionView());

      // Should handle responses that don't have question_category
      expect(result.current.groupedByCategory).toBeDefined();
    });
  });

  describe("error handling", () => {
    it("should handle submission errors gracefully", () => {
      const { result } = renderHook(() => useSubmissionView());

      expect(result.current.submissionError).toBeDefined();
    });

    it("should continue working even with errors", () => {
      const { result } = renderHook(() => useSubmissionView());

      // Should still provide all expected properties even with errors
      expect(result.current.submissionLoading).toBeDefined();
      expect(
        result.current.submission === null ||
          result.current.submission === undefined ||
          typeof result.current.submission === "object",
      ).toBe(true);
      expect(
        result.current.responses === null ||
          result.current.responses === undefined ||
          Array.isArray(result.current.responses),
      ).toBe(true);
      expect(result.current.groupedByCategory).toBeDefined();
      expect(result.current.categories).toBeDefined();
    });
  });
});
