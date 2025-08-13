import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useManageCategories } from '../useManageCategories';
import { createMockCategory } from '@/test/setup';

// Mock the offline API
vi.mock('@/hooks/useOfflineApi', () => ({
  useOfflineCategories: () => ({
    data: { categories: [] },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useOfflineCategoriesMutation: () => ({
    createCategory: {
      mutate: vi.fn(),
      isPending: false,
    },
    updateCategory: {
      mutate: vi.fn(),
      isPending: false,
    },
    deleteCategory: {
      mutate: vi.fn(),
      isPending: false,
    },
  }),
  useOfflineSyncStatus: () => ({
    isOnline: true,
  }),
}));

describe('useManageCategories', () => {
  const mockCategories = [
    createMockCategory({ category_id: '1', name: 'Category 1', weight: 30 }),
    createMockCategory({ category_id: '2', name: 'Category 2', weight: 40 }),
    createMockCategory({ category_id: '3', name: 'Category 3', weight: 30 }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useManageCategories());

      expect(result.current.categories).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isPending).toBe(false);
      expect(result.current.isDialogOpen).toBe(false);
      expect(result.current.editingCategory).toBeNull();
      expect(result.current.formData).toEqual({
        name: '',
        weight: 25,
        order: 1,
      });
    });
  });

  describe('category editing', () => {
    it('should open edit dialog with category data', () => {
      const { result } = renderHook(() => useManageCategories());

      const categoryToEdit = mockCategories[0];

      act(() => {
        result.current.handleEdit(categoryToEdit);
      });

      expect(result.current.isDialogOpen).toBe(true);
      expect(result.current.editingCategory).toBe(categoryToEdit);
      expect(result.current.formData).toEqual({
        name: categoryToEdit.name,
        weight: categoryToEdit.weight,
        order: categoryToEdit.order,
      });
    });
  });

  describe('weight validation', () => {
    it('should calculate total weight correctly', () => {
      vi.mocked(require('@/hooks/useOfflineApi').useOfflineCategories).mockReturnValue({
        data: { categories: mockCategories },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      const { result } = renderHook(() => useManageCategories());

      expect(result.current.totalWeight).toBe(100); // 30 + 40 + 30
    });
  });
}); 