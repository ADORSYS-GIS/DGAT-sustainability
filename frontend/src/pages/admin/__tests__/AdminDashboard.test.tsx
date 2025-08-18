import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminDashboard } from "../AdminDashboard";

// Mock the hook
vi.mock("@/hooks/admin/useAdminDashboard", () => ({
  useAdminDashboard: () => ({
    pendingReviews: [],
    pendingReviewsCount: 0,
    systemStats: {},
    adminActions: [],
    isLoading: false,
  }),
}));

// Mock all components
vi.mock("@/components/admin/AdminDashboard", () => ({
  AdminDashboardHeader: () => (
    <div data-testid="admin-dashboard-header">Header</div>
  ),
  SystemStats: () => <div data-testid="system-stats">Stats</div>,
  AdminActions: () => <div data-testid="admin-actions">Actions</div>,
  PendingReviews: () => <div data-testid="pending-reviews">Reviews</div>,
  AdminGuide: () => <div data-testid="admin-guide">Guide</div>,
}));

describe("AdminDashboard", () => {
  it("renders admin dashboard components", () => {
    render(<AdminDashboard />);

    expect(screen.getByTestId("admin-dashboard-header")).toBeInTheDocument();
    expect(screen.getByTestId("system-stats")).toBeInTheDocument();
    expect(screen.getByTestId("admin-actions")).toBeInTheDocument();
    expect(screen.getByTestId("pending-reviews")).toBeInTheDocument();
    expect(screen.getByTestId("admin-guide")).toBeInTheDocument();
  });
});
