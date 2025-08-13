import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAssessment } from '../useAssessment';
import { createMockCategory, createMockQuestion } from '@/test/setup';

// Mock the API functions
vi.mock('@/openapi-rq/requests/api', () => ({
  getCategories: vi.fn(),
  getQuestions: vi.fn(),
  createSubmission: vi.fn(),
  getSubmissions: vi.fn(),
}));

// Mock the offline API
vi.mock('@/hooks/useOfflineApi', () => ({
  useOfflineApi: () => ({
    isOnline: true,
    syncData: vi.fn(),
  }),
}));

// Mock the offline store
vi.mock('@/stores/offlineStore', () => ({
  useOfflineStore: () => ({
    isOnline: true,
    pendingSubmissions: [],
    pendingReviews: [],
    setOnlineStatus: vi.fn(),
    addPendingSubmission: vi.fn(),
    removePendingSubmission: vi.fn(),
    addPendingReview: vi.fn(),
    removePendingReview: vi.fn(),
  }),
}));

// Mock IndexedDB
vi.mock('@/hooks/useOfflineLocal', () => ({
  useOfflineLocal: () => ({
    saveAssessment: vi.fn(),
    getAssessment: vi.fn(),
    saveSubmission: vi.fn(),
    getSubmissions: vi.fn(),
  }),
}));

describe('useAssessment', () => {
  const mockCategories = [
    createMockCategory({ category_id: '1', name: 'Category 1', weight: 50 }),
    createMockCategory({ category_id: '2', name: 'Category 2', weight: 50 }),
  ];

  const mockQuestions = [
    createMockQuestion({
      question_id: '1',
      category: 'Category 1',
      latest_revision: {
        question_revision_id: 'rev1',
        question_id: '1',
        text: { en: 'Question 1' },
        weight: 5,
        created_at: '2024-01-01T00:00:00Z',
      },
    }),
    createMockQuestion({
      question_id: '2',
      category: 'Category 1',
      latest_revision: {
        question_revision_id: 'rev2',
        question_id: '2',
        text: { en: 'Question 2' },
        weight: 5,
        created_at: '2024-01-01T00:00:00Z',
      },
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAssessment());

      expect(result.current.categories).toEqual([]);
      expect(result.current.questions).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.currentCategoryIndex).toBe(0);
      expect(result.current.answers).toEqual({});
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.showPercentInfo).toBe(false);
    });
  });

  describe('data loading', () => {
    it('should load categories and questions successfully', async () => {
      vi.mocked(require('@/openapi-rq/requests/api').getCategories).mockResolvedValue(mockCategories);
      vi.mocked(require('@/openapi-rq/requests/api').getQuestions).mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useAssessment());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.categories).toEqual(mockCategories);
      expect(result.current.questions).toEqual(mockQuestions);
      expect(result.current.error).toBeNull();
    });

    it('should handle loading error', async () => {
      const mockError = new Error('Failed to load data');
      vi.mocked(require('@/openapi-rq/requests/api').getCategories).mockRejectedValue(mockError);

      const { result } = renderHook(() => useAssessment());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.categories).toEqual([]);
      expect(result.current.questions).toEqual([]);
      expect(result.current.error).toBe(mockError);
    });
  });

  describe('assessment navigation', () => {
    it('should navigate to next category', async () => {
      vi.mocked(require('@/openapi-rq/requests/api').getCategories).mockResolvedValue(mockCategories);
      vi.mocked(require('@/openapi-rq/requests/api').getQuestions).mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useAssessment());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentCategoryIndex).toBe(0);

      act(() => {
        result.current.handleNext();
      });

      expect(result.current.currentCategoryIndex).toBe(1);
    });

    it('should navigate to previous category', async () => {
      vi.mocked(require('@/openapi-rq/requests/api').getCategories).mockResolvedValue(mockCategories);
      vi.mocked(require('@/openapi-rq/requests/api').getQuestions).mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useAssessment());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handleNext();
      });

      expect(result.current.currentCategoryIndex).toBe(1);

      act(() => {
        result.current.handlePrevious();
      });

      expect(result.current.currentCategoryIndex).toBe(0);
    });

    it('should not navigate beyond boundaries', async () => {
      vi.mocked(require('@/openapi-rq/requests/api').getCategories).mockResolvedValue(mockCategories);
      vi.mocked(require('@/openapi-rq/requests/api').getQuestions).mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useAssessment());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Try to go previous from first category
      act(() => {
        result.current.handlePrevious();
      });

      expect(result.current.currentCategoryIndex).toBe(0);

      // Go to last category
      act(() => {
        result.current.handleNext();
      });

      expect(result.current.currentCategoryIndex).toBe(1);

      // Try to go next from last category
      act(() => {
        result.current.handleNext();
      });

      expect(result.current.currentCategoryIndex).toBe(1);
    });
  });

  describe('answer management', () => {
    it('should update answers correctly', async () => {
      vi.mocked(require('@/openapi-rq/requests/api').getCategories).mockResolvedValue(mockCategories);
      vi.mocked(require('@/openapi-rq/requests/api').getQuestions).mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useAssessment());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const questionKey = 'rev1';
      const answer = {
        yesNo: true,
        percentage: 75,
        text: 'Test answer',
      };

      act(() => {
        result.current.handleAnswerChange(questionKey, answer);
      });

      expect(result.current.answers[questionKey]).toEqual(answer);
    });

    it('should merge partial answers', async () => {
      vi.mocked(require('@/openapi-rq/requests/api').getCategories).mockResolvedValue(mockCategories);
      vi.mocked(require('@/openapi-rq/requests/api').getQuestions).mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useAssessment());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const questionKey = 'rev1';

      act(() => {
        result.current.handleAnswerChange(questionKey, { yesNo: true });
      });

      act(() => {
        result.current.handleAnswerChange(questionKey, { percentage: 75 });
      });

      expect(result.current.answers[questionKey]).toEqual({
        yesNo: true,
        percentage: 75,
      });
    });
  });

  describe('category completion validation', () => {
    it('should detect incomplete category', async () => {
      vi.mocked(require('@/openapi-rq/requests/api').getCategories).mockResolvedValue(mockCategories);
      vi.mocked(require('@/openapi-rq/requests/api').getQuestions).mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useAssessment());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isCurrentCategoryComplete).toBe(false);
    });

    it('should detect complete category', async () => {
      vi.mocked(require('@/openapi-rq/requests/api').getCategories).mockResolvedValue(mockCategories);
      vi.mocked(require('@/openapi-rq/requests/api').getQuestions).mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useAssessment());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Answer all questions in current category
      const currentCategoryQuestions = result.current.currentQuestions;
      currentCategoryQuestions.forEach(({ revision }) => {
        act(() => {
          result.current.handleAnswerChange(revision.question_revision_id, {
            yesNo: true,
            percentage: 75,
            text: 'Test answer',
          });
        });
      });

      expect(result.current.isCurrentCategoryComplete).toBe(true);
    });
  });

  describe('assessment submission', () => {
    it('should submit assessment successfully', async () => {
      const mockCreateSubmission = vi.fn().mockResolvedValue({ submission_id: 'test-submission' });
      vi.mocked(require('@/openapi-rq/requests/api').createSubmission).mockImplementation(mockCreateSubmission);
      vi.mocked(require('@/openapi-rq/requests/api').getCategories).mockResolvedValue(mockCategories);
      vi.mocked(require('@/openapi-rq/requests/api').getQuestions).mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useAssessment());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Fill all answers
      result.current.questions.forEach(({ revision }) => {
        act(() => {
          result.current.handleAnswerChange(revision.question_revision_id, {
            yesNo: true,
            percentage: 75,
            text: 'Test answer',
          });
        });
      });

      act(() => {
        result.current.handleSubmit();
      });

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false);
      });

      expect(mockCreateSubmission).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            responses: expect.arrayContaining([
              expect.objectContaining({
                question_revision_id: expect.any(String),
                response: expect.any(String),
              }),
            ]),
          }),
        })
      );
    });

    it('should handle submission error', async () => {
      const mockError = new Error('Failed to submit');
      const mockCreateSubmission = vi.fn().mockRejectedValue(mockError);
      vi.mocked(require('@/openapi-rq/requests/api').createSubmission).mockImplementation(mockCreateSubmission);
      vi.mocked(require('@/openapi-rq/requests/api').getCategories).mockResolvedValue(mockCategories);
      vi.mocked(require('@/openapi-rq/requests/api').getQuestions).mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useAssessment());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handleSubmit();
      });

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false);
      });

      expect(result.current.error).toBe(mockError);
    });
  });

  describe('progress calculation', () => {
    it('should calculate progress correctly', async () => {
      vi.mocked(require('@/openapi-rq/requests/api').getCategories).mockResolvedValue(mockCategories);
      vi.mocked(require('@/openapi-rq/requests/api').getQuestions).mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useAssessment());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Answer half of the questions
      const halfQuestions = result.current.questions.slice(0, Math.ceil(result.current.questions.length / 2));
      halfQuestions.forEach(({ revision }) => {
        act(() => {
          result.current.handleAnswerChange(revision.question_revision_id, {
            yesNo: true,
            percentage: 75,
            text: 'Test answer',
          });
        });
      });

      expect(result.current.progress).toBeGreaterThan(0);
      expect(result.current.progress).toBeLessThan(100);
    });

    it('should show 100% progress when all questions answered', async () => {
      vi.mocked(require('@/openapi-rq/requests/api').getCategories).mockResolvedValue(mockCategories);
      vi.mocked(require('@/openapi-rq/requests/api').getQuestions).mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useAssessment());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Answer all questions
      result.current.questions.forEach(({ revision }) => {
        act(() => {
          result.current.handleAnswerChange(revision.question_revision_id, {
            yesNo: true,
            percentage: 75,
            text: 'Test answer',
          });
        });
      });

      expect(result.current.progress).toBe(100);
    });
  });

  describe('file upload handling', () => {
    it('should handle file upload correctly', async () => {
      vi.mocked(require('@/openapi-rq/requests/api').getCategories).mockResolvedValue(mockCategories);
      vi.mocked(require('@/openapi-rq/requests/api').getQuestions).mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useAssessment());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const questionKey = 'rev1';
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const mockFileList = {
        0: mockFile,
        length: 1,
        item: (index: number) => mockFile,
      } as FileList;

      act(() => {
        result.current.handleFileUpload(questionKey, mockFileList);
      });

      expect(result.current.answers[questionKey]?.files).toBeDefined();
    });

    it('should handle null file list', async () => {
      vi.mocked(require('@/openapi-rq/requests/api').getCategories).mockResolvedValue(mockCategories);
      vi.mocked(require('@/openapi-rq/requests/api').getQuestions).mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useAssessment());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const questionKey = 'rev1';

      act(() => {
        result.current.handleFileUpload(questionKey, null);
      });

      expect(result.current.answers[questionKey]?.files).toBeUndefined();
    });
  });

  describe('UI state management', () => {
    it('should toggle percent info visibility', async () => {
      vi.mocked(require('@/openapi-rq/requests/api').getCategories).mockResolvedValue(mockCategories);
      vi.mocked(require('@/openapi-rq/requests/api').getQuestions).mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useAssessment());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.showPercentInfo).toBe(false);

      act(() => {
        result.current.setShowPercentInfo(true);
      });

      expect(result.current.showPercentInfo).toBe(true);

      act(() => {
        result.current.setShowPercentInfo(false);
      });

      expect(result.current.showPercentInfo).toBe(false);
    });
  });

  describe('retry functionality', () => {
    it('should retry loading on error', async () => {
      const mockGetCategories = vi.fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(mockCategories);
      vi.mocked(require('@/openapi-rq/requests/api').getCategories).mockImplementation(mockGetCategories);
      vi.mocked(require('@/openapi-rq/requests/api').getQuestions).mockResolvedValue(mockQuestions);

      const { result } = renderHook(() => useAssessment());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.retry();
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.categories).toEqual(mockCategories);
      expect(mockGetCategories).toHaveBeenCalledTimes(2);
    });
  });
}); 