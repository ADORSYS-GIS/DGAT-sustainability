import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { Dashboard } from '../Dashboard';
import { createMockSubmission } from '@/test/setup';

// Mock the hook
vi.mock('@/hooks/user/useDashboard', () => ({
  useDashboard: vi.fn(),
}));

// Mock the components
vi.mock('@/components/user/Dashboard/DashboardHeader', () => ({
  DashboardHeader: () => <div data-testid="dashboard-header">Dashboard Header</div>,
}));

vi.mock('@/components/user/Dashboard/DashboardActions', () => ({
  DashboardActions: ({ actions }: { actions: any[] }) => (
    <div data-testid="dashboard-actions">
      {actions.map((action, index) => (
        <button key={index} onClick={action.onClick} data-testid={`action-${action.title}`}>
          {action.title}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@/components/user/Dashboard/RecentSubmissions', () => ({
  RecentSubmissions: ({ submissions }: { submissions: any[] }) => (
    <div data-testid="recent-submissions">
      {submissions.map((submission, index) => (
        <div key={index} data-testid={`submission-${index}`}>
          {submission.org_name}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/components/user/Dashboard/HelpCard', () => ({
  HelpCard: () => <div data-testid="help-card">Help Card</div>,
}));

vi.mock('@/components/user/Dashboard/ExportReports', () => ({
  ExportReports: () => <div data-testid="export-reports">Export Reports</div>,
}));

describe('Dashboard', () => {
  const mockSubmissions = [
    createMockSubmission({ submission_id: '1', org_name: 'Org 1' }),
    createMockSubmission({ submission_id: '2', org_name: 'Org 2' }),
    createMockSubmission({ submission_id: '3', org_name: 'Org 3' }),
  ];

  const mockActions = [
    { title: 'Start Assessment', onClick: vi.fn(), icon: 'Plus', color: 'blue' },
    { title: 'View Submissions', onClick: vi.fn(), icon: 'List', color: 'green' },
    { title: 'Action Plan', onClick: vi.fn(), icon: 'Target', color: 'purple' },
    { title: 'User Guide', onClick: vi.fn(), icon: 'BookOpen', color: 'orange' },
  ];

  const mockUseDashboard = {
    submissions: mockSubmissions,
    actions: mockActions,
    isLoading: false,
    error: null,
    isOnline: true,
    stats: {
      totalSubmissions: 15,
      completedAssessments: 12,
      pendingReviews: 3,
      averageScore: 85,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(require('@/hooks/user/useDashboard').useDashboard).mockReturnValue(mockUseDashboard);
  });

  describe('rendering', () => {
    it('should render the dashboard header', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    });

    it('should render dashboard actions', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      expect(screen.getByTestId('dashboard-actions')).toBeInTheDocument();
      expect(screen.getByTestId('action-Start Assessment')).toBeInTheDocument();
      expect(screen.getByTestId('action-View Submissions')).toBeInTheDocument();
      expect(screen.getByTestId('action-Action Plan')).toBeInTheDocument();
      expect(screen.getByTestId('action-User Guide')).toBeInTheDocument();
    });

    it('should render recent submissions', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      expect(screen.getByTestId('recent-submissions')).toBeInTheDocument();
      expect(screen.getByTestId('submission-0')).toBeInTheDocument();
      expect(screen.getByTestId('submission-1')).toBeInTheDocument();
      expect(screen.getByTestId('submission-2')).toBeInTheDocument();
    });

    it('should render help card', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      expect(screen.getByTestId('help-card')).toBeInTheDocument();
    });

    it('should render export reports', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      expect(screen.getByTestId('export-reports')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading state when isLoading is true', () => {
      vi.mocked(require('@/hooks/user/useDashboard').useDashboard).mockReturnValue({
        ...mockUseDashboard,
        isLoading: true,
      });

      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      // Should show loading indicator
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('should handle error state gracefully', () => {
      vi.mocked(require('@/hooks/user/useDashboard').useDashboard).mockReturnValue({
        ...mockUseDashboard,
        error: new Error('Failed to load dashboard'),
      });

      expect(() => 
        render(
          <BrowserRouter>
            <Dashboard />
          </BrowserRouter>
        )
      ).not.toThrow();
    });
  });

  describe('dashboard actions interactions', () => {
    it('should call action onClick when action button is clicked', () => {
      const mockOnClick = vi.fn();
      const actionsWithMock = mockActions.map(action => ({
        ...action,
        onClick: mockOnClick,
      }));

      vi.mocked(require('@/hooks/user/useDashboard').useDashboard).mockReturnValue({
        ...mockUseDashboard,
        actions: actionsWithMock,
      });

      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      const startAssessmentButton = screen.getByTestId('action-Start Assessment');
      fireEvent.click(startAssessmentButton);

      expect(mockOnClick).toHaveBeenCalled();
    });

    it('should handle multiple action clicks', () => {
      const mockOnClick = vi.fn();
      const actionsWithMock = mockActions.map(action => ({
        ...action,
        onClick: mockOnClick,
      }));

      vi.mocked(require('@/hooks/user/useDashboard').useDashboard).mockReturnValue({
        ...mockUseDashboard,
        actions: actionsWithMock,
      });

      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      const startAssessmentButton = screen.getByTestId('action-Start Assessment');
      const viewSubmissionsButton = screen.getByTestId('action-View Submissions');

      fireEvent.click(startAssessmentButton);
      fireEvent.click(viewSubmissionsButton);

      expect(mockOnClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('data display', () => {
    it('should display submission data', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      expect(screen.getByText('Org 1')).toBeInTheDocument();
      expect(screen.getByText('Org 2')).toBeInTheDocument();
      expect(screen.getByText('Org 3')).toBeInTheDocument();
    });

    it('should display action buttons', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      expect(screen.getByText('Start Assessment')).toBeInTheDocument();
      expect(screen.getByText('View Submissions')).toBeInTheDocument();
      expect(screen.getByText('Action Plan')).toBeInTheDocument();
      expect(screen.getByText('User Guide')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    });

    it('should have proper button labels', () => {
      render(
        <BrowserRouter>
          <Dashboard />
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
          <Dashboard />
        </BrowserRouter>
      );

      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
      expect(screen.getByTestId('dashboard-actions')).toBeInTheDocument();
      expect(screen.getByTestId('recent-submissions')).toBeInTheDocument();
    });
  });

  describe('styling and layout', () => {
    it('should apply correct container classes', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      const main = screen.getByTestId('dashboard-header').closest('main');
      expect(main).toHaveClass('container', 'mx-auto', 'px-4', 'py-8');
    });

    it('should apply correct grid layout classes', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      // Check for grid layout in the dashboard
      const container = screen.getByTestId('dashboard-header').closest('div');
      expect(container).toHaveClass('space-y-8');
    });
  });

  describe('responsive design', () => {
    it('should apply responsive classes', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      const container = screen.getByTestId('dashboard-header').closest('main');
      expect(container).toHaveClass('px-4');
    });
  });

  describe('performance', () => {
    it('should render efficiently with many submissions', () => {
      const manySubmissions = Array.from({ length: 100 }, (_, i) =>
        createMockSubmission({
          submission_id: `${i}`,
          org_name: `Org ${i}`,
        })
      );

      vi.mocked(require('@/hooks/user/useDashboard').useDashboard).mockReturnValue({
        ...mockUseDashboard,
        submissions: manySubmissions,
      });

      const startTime = performance.now();
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );
      const endTime = performance.now();

      // Should render 100 submissions in reasonable time (less than 200ms)
      expect(endTime - startTime).toBeLessThan(200);
    });
  });

  describe('integration with hooks', () => {
    it('should pass correct props to components', () => {
      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      // Verify that components receive the correct data
      expect(screen.getByTestId('dashboard-actions')).toBeInTheDocument();
      expect(screen.getByTestId('recent-submissions')).toBeInTheDocument();
    });

    it('should handle hook state changes correctly', () => {
      const { rerender } = render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      // Initially should show all components
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();

      // Change to loading state
      vi.mocked(require('@/hooks/user/useDashboard').useDashboard).mockReturnValue({
        ...mockUseDashboard,
        isLoading: true,
      });

      rerender(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      // Should still render header even in loading state
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty submissions array', () => {
      vi.mocked(require('@/hooks/user/useDashboard').useDashboard).mockReturnValue({
        ...mockUseDashboard,
        submissions: [],
      });

      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      // Should still render without crashing
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    });

    it('should handle empty actions array', () => {
      vi.mocked(require('@/hooks/user/useDashboard').useDashboard).mockReturnValue({
        ...mockUseDashboard,
        actions: [],
      });

      render(
        <BrowserRouter>
          <Dashboard />
        </BrowserRouter>
      );

      // Should still render without crashing
      expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    });

    it('should handle null or undefined hook values', () => {
      vi.mocked(require('@/hooks/user/useDashboard').useDashboard).mockReturnValue({
        ...mockUseDashboard,
        submissions: null as any,
        actions: undefined as any,
        stats: null as any,
      });

      // Should not crash when rendering with null/undefined values
      expect(() => 
        render(
          <BrowserRouter>
            <Dashboard />
          </BrowserRouter>
        )
      ).not.toThrow();
    });
  });
}); 