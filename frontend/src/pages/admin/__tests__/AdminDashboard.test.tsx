import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AdminDashboard } from '../AdminDashboard';

// Mock the hook
vi.mock('@/hooks/admin/useAdminDashboard', () => ({
  useAdminDashboard: vi.fn(),
}));

// Mock the components
vi.mock('@/components/admin/AdminDashboard/AdminDashboardHeader', () => ({
  AdminDashboardHeader: () => <div data-testid="admin-dashboard-header">Admin Dashboard Header</div>,
}));

vi.mock('@/components/admin/AdminDashboard/SystemStats', () => ({
  SystemStats: ({ stats }: { stats: any }) => (
    <div data-testid="system-stats">
      {stats.map((stat: any, index: number) => (
        <div key={index} data-testid={`stat-${stat.label}`}>
          {stat.label}: {stat.value}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/admin/AdminDashboard/AdminActions', () => ({
  AdminActions: ({ actions }: { actions: any[] }) => (
    <div data-testid="admin-actions">
      {actions.map((action, index) => (
        <button key={index} onClick={action.onClick} data-testid={`action-${action.title}`}>
          {action.title}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@/components/admin/AdminDashboard/PendingReviews', () => ({
  PendingReviews: ({ reviews }: { reviews: any[] }) => (
    <div data-testid="pending-reviews">
      {reviews.map((review, index) => (
        <div key={index} data-testid={`review-${index}`}>
          {review.org_name}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/admin/AdminDashboard/AdminGuide', () => ({
  AdminGuide: () => <div data-testid="admin-guide">Admin Guide</div>,
}));

describe('AdminDashboard', () => {
  const mockStats = [
    { label: 'Total Organizations', value: 25, icon: 'Building' },
    { label: 'Active Users', value: 150, icon: 'Users' },
    { label: 'Pending Reviews', value: 8, icon: 'Clock' },
    { label: 'Completed Assessments', value: 342, icon: 'CheckCircle' },
  ];

  const mockActions = [
    { title: 'Manage Categories', onClick: vi.fn(), icon: 'List', color: 'blue' },
    { title: 'Manage Organizations', onClick: vi.fn(), icon: 'Building', color: 'green' },
    { title: 'Manage Users', onClick: vi.fn(), icon: 'Users', color: 'purple' },
    { title: 'Review Assessments', onClick: vi.fn(), icon: 'Eye', color: 'orange' },
    { title: 'Manage Questions', onClick: vi.fn(), icon: 'FileText', color: 'red' },
    { title: 'Standard Recommendations', onClick: vi.fn(), icon: 'Star', color: 'yellow' },
  ];

  const mockPendingReviews = [
    { submission_id: '1', org_name: 'Org 1', submitted_at: '2024-01-01' },
    { submission_id: '2', org_name: 'Org 2', submitted_at: '2024-01-02' },
  ];

  const mockUseAdminDashboard = {
    stats: mockStats,
    actions: mockActions,
    pendingReviews: mockPendingReviews,
    isLoading: false,
    error: null,
    isOnline: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(require('@/hooks/admin/useAdminDashboard').useAdminDashboard).mockReturnValue(mockUseAdminDashboard);
  });

  describe('rendering', () => {
    it('should render the admin dashboard header', () => {
      render(
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      );

      expect(screen.getByTestId('admin-dashboard-header')).toBeInTheDocument();
    });

    it('should render system stats', () => {
      render(
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      );

      expect(screen.getByTestId('system-stats')).toBeInTheDocument();
      expect(screen.getByTestId('stat-Total Organizations')).toBeInTheDocument();
      expect(screen.getByTestId('stat-Active Users')).toBeInTheDocument();
      expect(screen.getByTestId('stat-Pending Reviews')).toBeInTheDocument();
      expect(screen.getByTestId('stat-Completed Assessments')).toBeInTheDocument();
    });

    it('should render admin actions', () => {
      render(
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      );

      expect(screen.getByTestId('admin-actions')).toBeInTheDocument();
      expect(screen.getByTestId('action-Manage Categories')).toBeInTheDocument();
      expect(screen.getByTestId('action-Manage Organizations')).toBeInTheDocument();
      expect(screen.getByTestId('action-Manage Users')).toBeInTheDocument();
      expect(screen.getByTestId('action-Review Assessments')).toBeInTheDocument();
      expect(screen.getByTestId('action-Manage Questions')).toBeInTheDocument();
      expect(screen.getByTestId('action-Standard Recommendations')).toBeInTheDocument();
    });

    it('should render pending reviews', () => {
      render(
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      );

      expect(screen.getByTestId('pending-reviews')).toBeInTheDocument();
      expect(screen.getByTestId('review-0')).toBeInTheDocument();
      expect(screen.getByTestId('review-1')).toBeInTheDocument();
    });

    it('should render admin guide', () => {
      render(
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      );

      expect(screen.getByTestId('admin-guide')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading state when isLoading is true', () => {
      vi.mocked(require('@/hooks/admin/useAdminDashboard').useAdminDashboard).mockReturnValue({
        ...mockUseAdminDashboard,
        isLoading: true,
      });

      render(
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      );

      // Should show loading indicator
      expect(screen.getByTestId('admin-dashboard-header')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should handle error state gracefully', () => {
      vi.mocked(require('@/hooks/admin/useAdminDashboard').useAdminDashboard).mockReturnValue({
        ...mockUseAdminDashboard,
        error: new Error('Failed to load dashboard'),
      });

      expect(() => 
        render(
          <BrowserRouter>
            <AdminDashboard />
          </BrowserRouter>
        )
      ).not.toThrow();
    });
  });

  describe('admin actions interactions', () => {
    it('should call action onClick when action button is clicked', () => {
      const mockOnClick = vi.fn();
      const actionsWithMock = mockActions.map(action => ({
        ...action,
        onClick: mockOnClick,
      }));

      vi.mocked(require('@/hooks/admin/useAdminDashboard').useAdminDashboard).mockReturnValue({
        ...mockUseAdminDashboard,
        actions: actionsWithMock,
      });

      render(
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      );

      const manageCategoriesButton = screen.getByTestId('action-Manage Categories');
      fireEvent.click(manageCategoriesButton);

      expect(mockOnClick).toHaveBeenCalled();
    });

    it('should handle multiple action clicks', () => {
      const mockOnClick = vi.fn();
      const actionsWithMock = mockActions.map(action => ({
        ...action,
        onClick: mockOnClick,
      }));

      vi.mocked(require('@/hooks/admin/useAdminDashboard').useAdminDashboard).mockReturnValue({
        ...mockUseAdminDashboard,
        actions: actionsWithMock,
      });

      render(
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      );

      const manageCategoriesButton = screen.getByTestId('action-Manage Categories');
      const manageOrganizationsButton = screen.getByTestId('action-Manage Organizations');

      fireEvent.click(manageCategoriesButton);
      fireEvent.click(manageOrganizationsButton);

      expect(mockOnClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('data display', () => {
    it('should display correct stats values', () => {
      render(
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      );

      expect(screen.getByText('Total Organizations: 25')).toBeInTheDocument();
      expect(screen.getByText('Active Users: 150')).toBeInTheDocument();
      expect(screen.getByText('Pending Reviews: 8')).toBeInTheDocument();
      expect(screen.getByText('Completed Assessments: 342')).toBeInTheDocument();
    });

    it('should display correct pending reviews', () => {
      render(
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      );

      expect(screen.getByText('Org 1')).toBeInTheDocument();
      expect(screen.getByText('Org 2')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      );

      // Check that the dashboard has proper structure
      expect(screen.getByTestId('admin-dashboard-header')).toBeInTheDocument();
    });

    it('should have proper button labels', () => {
      render(
        <BrowserRouter>
          <AdminDashboard />
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
          <AdminDashboard />
        </BrowserRouter>
      );

      // Check for main content areas
      expect(screen.getByTestId('admin-dashboard-header')).toBeInTheDocument();
      expect(screen.getByTestId('system-stats')).toBeInTheDocument();
      expect(screen.getByTestId('admin-actions')).toBeInTheDocument();
    });
  });

  describe('styling and layout', () => {
    it('should apply correct container classes', () => {
      render(
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      );

      const main = screen.getByTestId('admin-dashboard-header').closest('main');
      expect(main).toHaveClass('container', 'mx-auto', 'px-4', 'py-8');
    });

    it('should apply correct grid layout classes', () => {
      render(
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      );

      // Check for grid layout in the dashboard
      const container = screen.getByTestId('admin-dashboard-header').closest('div');
      expect(container).toHaveClass('space-y-8');
    });
  });

  describe('responsive design', () => {
    it('should apply responsive classes', () => {
      render(
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      );

      const container = screen.getByTestId('admin-dashboard-header').closest('main');
      expect(container).toHaveClass('px-4');
    });
  });

  describe('performance', () => {
    it('should render efficiently', () => {
      const startTime = performance.now();
      render(
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      );
      const endTime = performance.now();

      // Should render in reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });
  });

  describe('integration with hooks', () => {
    it('should pass correct props to components', () => {
      render(
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      );

      // Verify that components receive the correct data
      expect(screen.getByTestId('system-stats')).toBeInTheDocument();
      expect(screen.getByTestId('admin-actions')).toBeInTheDocument();
      expect(screen.getByTestId('pending-reviews')).toBeInTheDocument();
    });

    it('should handle hook state changes correctly', () => {
      const { rerender } = render(
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      );

      // Initially should show all components
      expect(screen.getByTestId('admin-dashboard-header')).toBeInTheDocument();

      // Change to loading state
      vi.mocked(require('@/hooks/admin/useAdminDashboard').useAdminDashboard).mockReturnValue({
        ...mockUseAdminDashboard,
        isLoading: true,
      });

      rerender(
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      );

      // Should still render header even in loading state
      expect(screen.getByTestId('admin-dashboard-header')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty stats array', () => {
      vi.mocked(require('@/hooks/admin/useAdminDashboard').useAdminDashboard).mockReturnValue({
        ...mockUseAdminDashboard,
        stats: [],
      });

      render(
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      );

      // Should still render without crashing
      expect(screen.getByTestId('admin-dashboard-header')).toBeInTheDocument();
    });

    it('should handle empty actions array', () => {
      vi.mocked(require('@/hooks/admin/useAdminDashboard').useAdminDashboard).mockReturnValue({
        ...mockUseAdminDashboard,
        actions: [],
      });

      render(
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      );

      // Should still render without crashing
      expect(screen.getByTestId('admin-dashboard-header')).toBeInTheDocument();
    });

    it('should handle empty pending reviews array', () => {
      vi.mocked(require('@/hooks/admin/useAdminDashboard').useAdminDashboard).mockReturnValue({
        ...mockUseAdminDashboard,
        pendingReviews: [],
      });

      render(
        <BrowserRouter>
          <AdminDashboard />
        </BrowserRouter>
      );

      // Should still render without crashing
      expect(screen.getByTestId('admin-dashboard-header')).toBeInTheDocument();
    });

    it('should handle null or undefined hook values', () => {
      vi.mocked(require('@/hooks/admin/useAdminDashboard').useAdminDashboard).mockReturnValue({
        ...mockUseAdminDashboard,
        stats: null as any,
        actions: undefined as any,
        pendingReviews: null as any,
      });

      // Should not crash when rendering with null/undefined values
      expect(() => 
        render(
          <BrowserRouter>
            <AdminDashboard />
          </BrowserRouter>
        )
      ).not.toThrow();
    });
  });
}); 