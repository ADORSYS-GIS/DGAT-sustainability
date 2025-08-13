
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import ManageCategories from '../ManageCategories';
import { createMockCategory } from '@/test/setup';

// Mock the hook
vi.mock('@/hooks/admin/useManageCategories', () => ({
  useManageCategories: vi.fn(),
}));

// Mock the components
vi.mock('@/components/admin/ManageCategories/CategoryHeader', () => ({
  CategoryHeader: () => <div data-testid="category-header">Category Header</div>,
}));

vi.mock('@/components/admin/ManageCategories/OfflineStatusIndicator', () => ({
  OfflineStatusIndicator: ({ isOnline }: { isOnline: boolean }) => (
    <div data-testid="offline-status" data-online={isOnline}>
      Offline Status
    </div>
  ),
}));

vi.mock('@/components/admin/ManageCategories/CategoryForm', () => ({
  CategoryForm: ({ isDialogOpen, onSubmit }: { isDialogOpen: boolean; onSubmit: any }) => (
    <div data-testid="category-form" data-open={isDialogOpen}>
      <button onClick={onSubmit}>Submit Form</button>
    </div>
  ),
}));

vi.mock('@/components/admin/ManageCategories/CategoryList', () => ({
  CategoryList: ({ 
    categories, 
    onEdit, 
    onDelete, 
    weightExceeds, 
    weightNot100,
    onRedistributeWeights 
  }: any) => (
    <div data-testid="category-list">
      {categories.map((cat: any) => (
        <div key={cat.category_id} data-testid={`category-${cat.category_id}`}>
          {cat.name}
          <button onClick={() => onEdit(cat)}>Edit {cat.name}</button>
          <button onClick={() => onDelete(cat.category_id)}>Delete {cat.name}</button>
        </div>
      ))}
      {weightExceeds && (
        <button onClick={onRedistributeWeights}>Redistribute Weights</button>
      )}
      {weightNot100 && <div>Weight not 100%</div>}
    </div>
  ),
}));

vi.mock('@/components/admin/ManageCategories/LoadingState', () => ({
  LoadingState: () => <div data-testid="loading-state">Loading...</div>,
}));

vi.mock('@/components/admin/ManageCategories/ErrorState', () => ({
  ErrorState: ({ error, onRetry }: { error: Error; onRetry: () => void }) => (
    <div data-testid="error-state">
      <div>Error: {error.message}</div>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

describe('ManageCategories', () => {
  const mockCategories = [
    createMockCategory({ category_id: '1', name: 'Category 1', weight: 30 }),
    createMockCategory({ category_id: '2', name: 'Category 2', weight: 40 }),
    createMockCategory({ category_id: '3', name: 'Category 3', weight: 30 }),
  ];

  const mockUseManageCategories = {
    categories: mockCategories,
    isLoading: false,
    error: null,
    isPending: false,
    isDialogOpen: false,
    editingCategory: null,
    formData: { name: '', weight: 0, order: 1 },
    weightExceeds: false,
    weightNot100: false,
    totalWeight: 100,
    isOnline: true,
    setFormData: vi.fn(),
    setIsDialogOpen: vi.fn(),
    setEditingCategory: vi.fn(),
    handleSubmit: vi.fn(),
    handleEdit: vi.fn(),
    handleDelete: vi.fn(),
    onRedistributeWeights: vi.fn(),
    retry: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(require('@/hooks/admin/useManageCategories').useManageCategories).mockReturnValue(mockUseManageCategories);
  });

  describe('rendering states', () => {
    it('should render loading state when isLoading is true', () => {
      vi.mocked(require('@/hooks/admin/useManageCategories').useManageCategories).mockReturnValue({
        ...mockUseManageCategories,
        isLoading: true,
      });

      render(
        <BrowserRouter>
          <ManageCategories />
        </BrowserRouter>
      );

      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
      expect(screen.queryByTestId('category-header')).not.toBeInTheDocument();
    });

    it('should render error state when error exists', () => {
      const mockError = new Error('Failed to load categories');
      vi.mocked(require('@/hooks/admin/useManageCategories').useManageCategories).mockReturnValue({
        ...mockUseManageCategories,
        error: mockError,
      });

      render(
        <BrowserRouter>
          <ManageCategories />
        </BrowserRouter>
      );

      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      expect(screen.getByText('Error: Failed to load categories')).toBeInTheDocument();
    });

    it('should render main content when not loading and no error', () => {
      render(
        <BrowserRouter>
          <ManageCategories />
        </BrowserRouter>
      );

      expect(screen.getByTestId('category-header')).toBeInTheDocument();
      expect(screen.getByTestId('offline-status')).toBeInTheDocument();
      expect(screen.getByTestId('category-form')).toBeInTheDocument();
      expect(screen.getByTestId('category-list')).toBeInTheDocument();
    });
  });

  describe('offline status indicator', () => {
    it('should show online status when isOnline is true', () => {
      vi.mocked(require('@/hooks/admin/useManageCategories').useManageCategories).mockReturnValue({
        ...mockUseManageCategories,
        isOnline: true,
      });

      render(
        <BrowserRouter>
          <ManageCategories />
        </BrowserRouter>
      );

      const offlineStatus = screen.getByTestId('offline-status');
      expect(offlineStatus).toHaveAttribute('data-online', 'true');
    });

    it('should show offline status when isOnline is false', () => {
      vi.mocked(require('@/hooks/admin/useManageCategories').useManageCategories).mockReturnValue({
        ...mockUseManageCategories,
        isOnline: false,
      });

      render(
        <BrowserRouter>
          <ManageCategories />
        </BrowserRouter>
      );

      const offlineStatus = screen.getByTestId('offline-status');
      expect(offlineStatus).toHaveAttribute('data-online', 'false');
    });
  });

  describe('category list interactions', () => {
    it('should call handleEdit when edit button is clicked', () => {
      const handleEdit = vi.fn();
      vi.mocked(require('@/hooks/admin/useManageCategories').useManageCategories).mockReturnValue({
        ...mockUseManageCategories,
        handleEdit,
      });

      render(
        <BrowserRouter>
          <ManageCategories />
        </BrowserRouter>
      );

      const editButton = screen.getByText('Edit Category 1');
      fireEvent.click(editButton);

      expect(handleEdit).toHaveBeenCalledWith(mockCategories[0]);
    });

    it('should call handleDelete when delete button is clicked', () => {
      const handleDelete = vi.fn();
      vi.mocked(require('@/hooks/admin/useManageCategories').useManageCategories).mockReturnValue({
        ...mockUseManageCategories,
        handleDelete,
      });

      render(
        <BrowserRouter>
          <ManageCategories />
        </BrowserRouter>
      );

      const deleteButton = screen.getByText('Delete Category 1');
      fireEvent.click(deleteButton);

      expect(handleDelete).toHaveBeenCalledWith('1');
    });

    it('should show weight validation messages when needed', () => {
      vi.mocked(require('@/hooks/admin/useManageCategories').useManageCategories).mockReturnValue({
        ...mockUseManageCategories,
        weightExceeds: true,
        weightNot100: false,
      });

      render(
        <BrowserRouter>
          <ManageCategories />
        </BrowserRouter>
      );

      expect(screen.getByText('Redistribute Weights')).toBeInTheDocument();
    });

    it('should call onRedistributeWeights when redistribute button is clicked', () => {
      const onRedistributeWeights = vi.fn();
      vi.mocked(require('@/hooks/admin/useManageCategories').useManageCategories).mockReturnValue({
        ...mockUseManageCategories,
        weightExceeds: true,
        onRedistributeWeights,
      });

      render(
        <BrowserRouter>
          <ManageCategories />
        </BrowserRouter>
      );

      const redistributeButton = screen.getByText('Redistribute Weights');
      fireEvent.click(redistributeButton);

      expect(onRedistributeWeights).toHaveBeenCalled();
    });
  });

  describe('category form interactions', () => {
    it('should call handleSubmit when form is submitted', () => {
      const handleSubmit = vi.fn();
      vi.mocked(require('@/hooks/admin/useManageCategories').useManageCategories).mockReturnValue({
        ...mockUseManageCategories,
        handleSubmit,
      });

      render(
        <BrowserRouter>
          <ManageCategories />
        </BrowserRouter>
      );

      const submitButton = screen.getByText('Submit Form');
      fireEvent.click(submitButton);

      expect(handleSubmit).toHaveBeenCalled();
    });

    it('should show dialog when isDialogOpen is true', () => {
      vi.mocked(require('@/hooks/admin/useManageCategories').useManageCategories).mockReturnValue({
        ...mockUseManageCategories,
        isDialogOpen: true,
      });

      render(
        <BrowserRouter>
          <ManageCategories />
        </BrowserRouter>
      );

      const categoryForm = screen.getByTestId('category-form');
      expect(categoryForm).toHaveAttribute('data-open', 'true');
    });
  });

  describe('error handling', () => {
    it('should call retry when retry button is clicked in error state', () => {
      const retry = vi.fn();
      const mockError = new Error('Failed to load categories');
      vi.mocked(require('@/hooks/admin/useManageCategories').useManageCategories).mockReturnValue({
        ...mockUseManageCategories,
        error: mockError,
        retry,
      });

      render(
        <BrowserRouter>
          <ManageCategories />
        </BrowserRouter>
      );

      const retryButton = screen.getByText('Retry');
      fireEvent.click(retryButton);

      expect(retry).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(
        <BrowserRouter>
          <ManageCategories />
        </BrowserRouter>
      );

      // Check that the page has a main heading
      expect(screen.getByTestId('category-header')).toBeInTheDocument();
    });

    it('should have proper button labels', () => {
      render(
        <BrowserRouter>
          <ManageCategories />
        </BrowserRouter>
      );

      // Check that buttons have descriptive text
      expect(screen.getByText('Edit Category 1')).toBeInTheDocument();
      expect(screen.getByText('Delete Category 1')).toBeInTheDocument();
      expect(screen.getByText('Submit Form')).toBeInTheDocument();
    });
  });

  describe('performance', () => {
    it('should render efficiently with many categories', () => {
      const manyCategories = Array.from({ length: 100 }, (_, i) =>
        createMockCategory({
          category_id: `${i}`,
          name: `Category ${i}`,
          weight: 1,
        })
      );

      vi.mocked(require('@/hooks/admin/useManageCategories').useManageCategories).mockReturnValue({
        ...mockUseManageCategories,
        categories: manyCategories,
      });

      const startTime = performance.now();
      render(
        <BrowserRouter>
          <ManageCategories />
        </BrowserRouter>
      );
      const endTime = performance.now();

      // Should render 100 categories in reasonable time (less than 200ms)
      expect(endTime - startTime).toBeLessThan(200);
    });
  });

  describe('integration with hooks', () => {
    it('should pass correct props to CategoryList component', () => {
      const mockHook = {
        ...mockUseManageCategories,
        weightExceeds: true,
        weightNot100: true,
        totalWeight: 110,
      };

      vi.mocked(require('@/hooks/admin/useManageCategories').useManageCategories).mockReturnValue(mockHook);

      render(
        <BrowserRouter>
          <ManageCategories />
        </BrowserRouter>
      );

      // Verify that the CategoryList receives the correct props by checking its behavior
      expect(screen.getByText('Redistribute Weights')).toBeInTheDocument();
      expect(screen.getByText('Weight not 100%')).toBeInTheDocument();
    });

    it('should handle hook state changes correctly', () => {
      const { rerender } = render(
        <BrowserRouter>
          <ManageCategories />
        </BrowserRouter>
      );

      // Initially should show categories
      expect(screen.getByText('Category 1')).toBeInTheDocument();

      // Change to loading state
      vi.mocked(require('@/hooks/admin/useManageCategories').useManageCategories).mockReturnValue({
        ...mockUseManageCategories,
        isLoading: true,
      });

      rerender(
        <BrowserRouter>
          <ManageCategories />
        </BrowserRouter>
      );

      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty categories array', () => {
      vi.mocked(require('@/hooks/admin/useManageCategories').useManageCategories).mockReturnValue({
        ...mockUseManageCategories,
        categories: [],
      });

      render(
        <BrowserRouter>
          <ManageCategories />
        </BrowserRouter>
      );

      // Should still render without crashing
      expect(screen.getByTestId('category-list')).toBeInTheDocument();
    });

    it('should handle null or undefined hook values', () => {
      vi.mocked(require('@/hooks/admin/useManageCategories').useManageCategories).mockReturnValue({
        ...mockUseManageCategories,
        categories: null as any,
        error: undefined,
      });

      // Should not crash when rendering with null/undefined values
      expect(() => 
        render(
          <BrowserRouter>
            <ManageCategories />
          </BrowserRouter>
        )
      ).not.toThrow();
    });
  });
}); 