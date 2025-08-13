import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CategoryList } from '../CategoryList';
import { createMockCategory } from '@/test/setup';

describe('CategoryList', () => {
  const mockCategories = [
    createMockCategory({ category_id: '1', name: 'Category 1', weight: 30, order: 1 }),
    createMockCategory({ category_id: '2', name: 'Category 2', weight: 40, order: 2 }),
    createMockCategory({ category_id: '3', name: 'Category 3', weight: 30, order: 3 }),
  ];

  const defaultProps = {
    categories: mockCategories,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    isPending: false,
    weightExceeds: false,
    weightNot100: false,
    totalWeight: 100,
    onRedistributeWeights: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all categories', () => {
      render(<CategoryList {...defaultProps} />);

      expect(screen.getByText('Category 1')).toBeInTheDocument();
      expect(screen.getByText('Category 2')).toBeInTheDocument();
      expect(screen.getByText('Category 3')).toBeInTheDocument();
    });

    it('should display category details correctly', () => {
      render(<CategoryList {...defaultProps} />);

      // Check weight and order information
      expect(screen.getByText(/Weight: 30, Order: 1/)).toBeInTheDocument();
      expect(screen.getByText(/Weight: 40, Order: 2/)).toBeInTheDocument();
      expect(screen.getByText(/Weight: 30, Order: 3/)).toBeInTheDocument();
    });

    it('should render edit and delete buttons for each category', () => {
      render(<CategoryList {...defaultProps} />);

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });

      expect(editButtons).toHaveLength(3);
      expect(deleteButtons).toHaveLength(3);
    });
  });

  describe('interactions', () => {
    it('should call onEdit when edit button is clicked', () => {
      const onEdit = vi.fn();
      render(<CategoryList {...defaultProps} onEdit={onEdit} />);

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);

      expect(onEdit).toHaveBeenCalledWith(mockCategories[0]);
    });

    it('should call onDelete when delete button is clicked', () => {
      const onDelete = vi.fn();
      render(<CategoryList {...defaultProps} onDelete={onDelete} />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(onDelete).toHaveBeenCalledWith('1');
    });

    it('should disable buttons when isPending is true', () => {
      render(<CategoryList {...defaultProps} isPending={true} />);

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });

      editButtons.forEach(button => {
        expect(button).toBeDisabled();
      });

      deleteButtons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('weight validation messages', () => {
    it('should show weight exceeds error when weightExceeds is true', () => {
      render(<CategoryList {...defaultProps} weightExceeds={true} />);

      expect(screen.getByText(/total weight exceeds 100%/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /redistribute weights/i })).toBeInTheDocument();
    });

    it('should call onRedistributeWeights when redistribute button is clicked', () => {
      const onRedistributeWeights = vi.fn();
      render(
        <CategoryList 
          {...defaultProps} 
          weightExceeds={true} 
          onRedistributeWeights={onRedistributeWeights} 
        />
      );

      const redistributeButton = screen.getByRole('button', { name: /redistribute weights/i });
      fireEvent.click(redistributeButton);

      expect(onRedistributeWeights).toHaveBeenCalled();
    });

    it('should show weight not 100% warning when weightNot100 is true', () => {
      render(<CategoryList {...defaultProps} weightNot100={true} totalWeight={70} />);

      expect(screen.getByText(/total weight is 70%/i)).toBeInTheDocument();
    });

    it('should not show weight validation messages when weights are correct', () => {
      render(<CategoryList {...defaultProps} />);

      expect(screen.queryByText(/total weight exceeds 100%/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/total weight is/i)).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should show empty state when no categories exist', () => {
      render(<CategoryList {...defaultProps} categories={[]} />);

      expect(screen.getByText(/no categories yet/i)).toBeInTheDocument();
      expect(screen.getByText(/get started by creating your first category/i)).toBeInTheDocument();
    });

    it('should show category icon in empty state', () => {
      render(<CategoryList {...defaultProps} categories={[]} />);

      // Check for the List icon (from lucide-react)
      const icon = document.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels for buttons', () => {
      render(<CategoryList {...defaultProps} />);

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });

      editButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });

      deleteButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
      });
    });

    it('should have proper heading structure', () => {
      render(<CategoryList {...defaultProps} />);

      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings).toHaveLength(3);
      expect(headings[0]).toHaveTextContent('Category 1');
      expect(headings[1]).toHaveTextContent('Category 2');
      expect(headings[2]).toHaveTextContent('Category 3');
    });
  });

  describe('styling and layout', () => {
    it('should apply correct CSS classes', () => {
      render(<CategoryList {...defaultProps} />);

      const categoryItems = screen.getAllByText(/Category \d/);
      categoryItems.forEach(item => {
        const container = item.closest('div');
        expect(container).toHaveClass('flex', 'items-center', 'justify-between', 'p-4', 'border', 'rounded-lg');
      });
    });

    it('should apply disabled styling when isPending is true', () => {
      render(<CategoryList {...defaultProps} isPending={true} />);

      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });

      editButtons.forEach(button => {
        expect(button).toHaveClass('disabled');
      });

      deleteButtons.forEach(button => {
        expect(button).toHaveClass('disabled');
      });
    });
  });

  describe('error handling', () => {
    it('should handle missing category data gracefully', () => {
      const incompleteCategories = [
        { ...mockCategories[0], name: undefined },
        { ...mockCategories[1], weight: undefined },
      ];

      render(<CategoryList {...defaultProps} categories={incompleteCategories} />);

      // Should still render without crashing
      expect(screen.getByText('Category 2')).toBeInTheDocument();
    });

    it('should handle null or undefined props gracefully', () => {
      const propsWithNulls = {
        ...defaultProps,
        categories: null as any,
        onEdit: null as any,
        onDelete: null as any,
      };

      // Should not crash when rendering with null props
      expect(() => render(<CategoryList {...propsWithNulls} />)).not.toThrow();
    });
  });

  describe('performance', () => {
    it('should render efficiently with many categories', () => {
      const manyCategories = Array.from({ length: 100 }, (_, i) =>
        createMockCategory({
          category_id: `${i}`,
          name: `Category ${i}`,
          weight: 1,
          order: i + 1,
        })
      );

      const startTime = performance.now();
      render(<CategoryList {...defaultProps} categories={manyCategories} />);
      const endTime = performance.now();

      // Should render 100 categories in reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('integration with parent component', () => {
    it('should pass correct data to parent callbacks', () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      const onRedistributeWeights = vi.fn();

      render(
        <CategoryList
          {...defaultProps}
          onEdit={onEdit}
          onDelete={onDelete}
          onRedistributeWeights={onRedistributeWeights}
          weightExceeds={true}
        />
      );

      // Test edit callback
      const editButtons = screen.getAllByRole('button', { name: /edit/i });
      fireEvent.click(editButtons[0]);
      expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({
        category_id: '1',
        name: 'Category 1',
        weight: 30,
        order: 1,
      }));

      // Test delete callback
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);
      expect(onDelete).toHaveBeenCalledWith('1');

      // Test redistribute callback
      const redistributeButton = screen.getByRole('button', { name: /redistribute weights/i });
      fireEvent.click(redistributeButton);
      expect(onRedistributeWeights).toHaveBeenCalled();
    });
  });
}); 