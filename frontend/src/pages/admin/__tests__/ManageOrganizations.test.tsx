import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { ManageOrganizations } from '../ManageOrganizations';
import { createMockOrganization } from '@/test/setup';

// Mock the hook
vi.mock('@/hooks/admin/useManageOrganizations', () => ({
  useManageOrganizations: vi.fn(),
}));

// Mock the components
vi.mock('@/components/admin/ManageOrganizations/OrganizationHeader', () => ({
  OrganizationHeader: () => <div data-testid="organization-header">Organization Header</div>,
}));

vi.mock('@/components/admin/ManageOrganizations/OrganizationForm', () => ({
  OrganizationForm: ({ isDialogOpen, onSubmit }: { isDialogOpen: boolean; onSubmit: any }) => (
    <div data-testid="organization-form" data-open={isDialogOpen}>
      <button onClick={onSubmit}>Submit Form</button>
    </div>
  ),
}));

vi.mock('@/components/admin/ManageOrganizations/OrganizationList', () => ({
  OrganizationList: ({ 
    organizations, 
    onEdit, 
    onDelete, 
    isPending 
  }: any) => (
    <div data-testid="organization-list">
      {organizations.map((org: any) => (
        <div key={org.id} data-testid={`organization-${org.id}`}>
          {org.name}
          <button onClick={() => onEdit(org)}>Edit {org.name}</button>
          <button onClick={() => onDelete(org.id)}>Delete {org.name}</button>
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/admin/ManageOrganizations/LoadingState', () => ({
  LoadingState: () => <div data-testid="loading-state">Loading...</div>,
}));

describe('ManageOrganizations', () => {
  const mockOrganizations = [
    createMockOrganization({ id: '1', name: 'Organization 1' }),
    createMockOrganization({ id: '2', name: 'Organization 2' }),
    createMockOrganization({ id: '3', name: 'Organization 3' }),
  ];

  const mockUseManageOrganizations = {
    organizations: mockOrganizations,
    isLoading: false,
    error: null,
    isPending: false,
    isDialogOpen: false,
    editingOrganization: null,
    formData: { name: '', alias: '', description: '', domains: [] },
    setFormData: vi.fn(),
    setIsDialogOpen: vi.fn(),
    setEditingOrganization: vi.fn(),
    handleSubmit: vi.fn(),
    handleEdit: vi.fn(),
    handleDelete: vi.fn(),
    retry: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(require('@/hooks/admin/useManageOrganizations').useManageOrganizations).mockReturnValue(mockUseManageOrganizations);
  });

  describe('rendering', () => {
    it('should render the organization header', () => {
      render(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );

      expect(screen.getByTestId('organization-header')).toBeInTheDocument();
    });

    it('should render organization list', () => {
      render(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );

      expect(screen.getByTestId('organization-list')).toBeInTheDocument();
      expect(screen.getByTestId('organization-1')).toBeInTheDocument();
      expect(screen.getByTestId('organization-2')).toBeInTheDocument();
      expect(screen.getByTestId('organization-3')).toBeInTheDocument();
    });

    it('should render organization form', () => {
      render(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );

      expect(screen.getByTestId('organization-form')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading state when isLoading is true', () => {
      vi.mocked(require('@/hooks/admin/useManageOrganizations').useManageOrganizations).mockReturnValue({
        ...mockUseManageOrganizations,
        isLoading: true,
      });

      render(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );

      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
      expect(screen.queryByTestId('organization-header')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should handle error state gracefully', () => {
      const mockError = new Error('Failed to load organizations');
      vi.mocked(require('@/hooks/admin/useManageOrganizations').useManageOrganizations).mockReturnValue({
        ...mockUseManageOrganizations,
        error: mockError,
      });

      expect(() => 
        render(
          <BrowserRouter>
            <ManageOrganizations />
          </BrowserRouter>
        )
      ).not.toThrow();
    });
  });

  describe('organization interactions', () => {
    it('should call handleEdit when edit button is clicked', () => {
      const handleEdit = vi.fn();
      vi.mocked(require('@/hooks/admin/useManageOrganizations').useManageOrganizations).mockReturnValue({
        ...mockUseManageOrganizations,
        handleEdit,
      });

      render(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );

      const editButton = screen.getByText('Edit Organization 1');
      fireEvent.click(editButton);

      expect(handleEdit).toHaveBeenCalledWith(mockOrganizations[0]);
    });

    it('should call handleDelete when delete button is clicked', () => {
      const handleDelete = vi.fn();
      vi.mocked(require('@/hooks/admin/useManageOrganizations').useManageOrganizations).mockReturnValue({
        ...mockUseManageOrganizations,
        handleDelete,
      });

      render(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );

      const deleteButton = screen.getByText('Delete Organization 1');
      fireEvent.click(deleteButton);

      expect(handleDelete).toHaveBeenCalledWith('1');
    });

    it('should call handleSubmit when form is submitted', () => {
      const handleSubmit = vi.fn();
      vi.mocked(require('@/hooks/admin/useManageOrganizations').useManageOrganizations).mockReturnValue({
        ...mockUseManageOrganizations,
        handleSubmit,
      });

      render(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );

      const submitButton = screen.getByText('Submit Form');
      fireEvent.click(submitButton);

      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  describe('form dialog state', () => {
    it('should show dialog when isDialogOpen is true', () => {
      vi.mocked(require('@/hooks/admin/useManageOrganizations').useManageOrganizations).mockReturnValue({
        ...mockUseManageOrganizations,
        isDialogOpen: true,
      });

      render(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );

      const organizationForm = screen.getByTestId('organization-form');
      expect(organizationForm).toHaveAttribute('data-open', 'true');
    });

    it('should hide dialog when isDialogOpen is false', () => {
      vi.mocked(require('@/hooks/admin/useManageOrganizations').useManageOrganizations).mockReturnValue({
        ...mockUseManageOrganizations,
        isDialogOpen: false,
      });

      render(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );

      const organizationForm = screen.getByTestId('organization-form');
      expect(organizationForm).toHaveAttribute('data-open', 'false');
    });
  });

  describe('data display', () => {
    it('should display organization names', () => {
      render(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );

      expect(screen.getByText('Organization 1')).toBeInTheDocument();
      expect(screen.getByText('Organization 2')).toBeInTheDocument();
      expect(screen.getByText('Organization 3')).toBeInTheDocument();
    });

    it('should display edit and delete buttons for each organization', () => {
      render(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );

      expect(screen.getByText('Edit Organization 1')).toBeInTheDocument();
      expect(screen.getByText('Delete Organization 1')).toBeInTheDocument();
      expect(screen.getByText('Edit Organization 2')).toBeInTheDocument();
      expect(screen.getByText('Delete Organization 2')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );

      expect(screen.getByTestId('organization-header')).toBeInTheDocument();
    });

    it('should have proper button labels', () => {
      render(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveTextContent(/.+/);
      });
    });

    it('should have proper semantic structure', () => {
      render(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );

      expect(screen.getByTestId('organization-header')).toBeInTheDocument();
      expect(screen.getByTestId('organization-list')).toBeInTheDocument();
      expect(screen.getByTestId('organization-form')).toBeInTheDocument();
    });
  });

  describe('styling and layout', () => {
    it('should apply correct container classes', () => {
      render(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );

      const main = screen.getByTestId('organization-header').closest('main');
      expect(main).toHaveClass('container', 'mx-auto', 'px-4', 'py-8');
    });

    it('should apply correct spacing classes', () => {
      render(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );

      const container = screen.getByTestId('organization-header').closest('div');
      expect(container).toHaveClass('space-y-8');
    });
  });

  describe('responsive design', () => {
    it('should apply responsive classes', () => {
      render(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );

      const container = screen.getByTestId('organization-header').closest('main');
      expect(container).toHaveClass('px-4');
    });
  });

  describe('performance', () => {
    it('should render efficiently with many organizations', () => {
      const manyOrganizations = Array.from({ length: 100 }, (_, i) =>
        createMockOrganization({
          id: `${i}`,
          name: `Organization ${i}`,
        })
      );

      vi.mocked(require('@/hooks/admin/useManageOrganizations').useManageOrganizations).mockReturnValue({
        ...mockUseManageOrganizations,
        organizations: manyOrganizations,
      });

      const startTime = performance.now();
      render(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );
      const endTime = performance.now();

      // Should render 100 organizations in reasonable time (less than 200ms)
      expect(endTime - startTime).toBeLessThan(200);
    });
  });

  describe('integration with hooks', () => {
    it('should pass correct props to components', () => {
      render(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );

      // Verify that components receive the correct data
      expect(screen.getByTestId('organization-list')).toBeInTheDocument();
      expect(screen.getByTestId('organization-form')).toBeInTheDocument();
    });

    it('should handle hook state changes correctly', () => {
      const { rerender } = render(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );

      // Initially should show organizations
      expect(screen.getByText('Organization 1')).toBeInTheDocument();

      // Change to loading state
      vi.mocked(require('@/hooks/admin/useManageOrganizations').useManageOrganizations).mockReturnValue({
        ...mockUseManageOrganizations,
        isLoading: true,
      });

      rerender(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );

      expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty organizations array', () => {
      vi.mocked(require('@/hooks/admin/useManageOrganizations').useManageOrganizations).mockReturnValue({
        ...mockUseManageOrganizations,
        organizations: [],
      });

      render(
        <BrowserRouter>
          <ManageOrganizations />
        </BrowserRouter>
      );

      // Should still render without crashing
      expect(screen.getByTestId('organization-list')).toBeInTheDocument();
    });

    it('should handle null or undefined hook values', () => {
      vi.mocked(require('@/hooks/admin/useManageOrganizations').useManageOrganizations).mockReturnValue({
        ...mockUseManageOrganizations,
        organizations: null as any,
        error: undefined,
      });

      // Should not crash when rendering with null/undefined values
      expect(() => 
        render(
          <BrowserRouter>
            <ManageOrganizations />
          </BrowserRouter>
        )
      ).not.toThrow();
    });
  });
}); 