import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dashboard } from "../Dashboard";

vi.mock("@/hooks/user/useDashboard", () => ({
  useDashboard: () => ({
    submissionsLoading: false,
    reportsLoading: false,
    submissions: [],
    reports: [],
    user: { name: "User" },
    userName: "John Doe",
    orgName: "Test Org",
    dashboardActions: [],
    getStatusColor: vi.fn(),
    formatStatus: vi.fn(),
    handleExportAllPDF: vi.fn(),
    handleViewAll: vi.fn(),
    handleViewGuide: vi.fn(),
  }),
}));

vi.mock("@/components/user/Dashboard", () => ({
  DashboardHeader: ({
    userName,
    orgName,
  }: {
    userName: string;
    orgName: string;
  }) => (
    <div data-testid="dashboard-header">
      {userName}-{orgName}
    </div>
  ),
  DashboardActions: () => <div data-testid="dashboard-actions">Actions</div>,
  RecentSubmissions: () => <div data-testid="recent-submissions">Recent</div>,
  ExportReports: () => <div data-testid="export-reports">Export</div>,
  HelpCard: () => <div data-testid="help-card">Help</div>,
}));

describe("User Dashboard Page", () => {
  it("renders essential dashboard sections", () => {
    render(<Dashboard />);

    expect(screen.getByTestId("dashboard-header")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-actions")).toBeInTheDocument();
    expect(screen.getByTestId("recent-submissions")).toBeInTheDocument();
    expect(screen.getByTestId("export-reports")).toBeInTheDocument();
    expect(screen.getByTestId("help-card")).toBeInTheDocument();
  });
});
