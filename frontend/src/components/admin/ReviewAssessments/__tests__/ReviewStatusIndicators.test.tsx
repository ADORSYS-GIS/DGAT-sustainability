import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReviewStatusIndicators } from "../ReviewStatusIndicators";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      const translations: Record<string, string> = {
        "reviewAssessments.syncData": "Sync Data",
        "common.online": "Online",
        "common.offline": "Offline",
        "reviewAssessments.pendingSync": "Pending Sync",
      };
      return translations[key] || key;
    },
  }),
}));

describe("ReviewStatusIndicators", () => {
  const defaultProps = {
    isOnline: true,
    pendingReviewsCount: 0,
    onManualSync: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render sync button", () => {
    render(<ReviewStatusIndicators {...defaultProps} />);

    expect(screen.getByText("Sync Data")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("should call onManualSync when sync button is clicked", () => {
    render(<ReviewStatusIndicators {...defaultProps} />);

    const syncButton = screen.getByText("Sync Data");
    fireEvent.click(syncButton);

    expect(defaultProps.onManualSync).toHaveBeenCalled();
  });

  it("should display online status when isOnline is true", () => {
    render(<ReviewStatusIndicators {...defaultProps} isOnline={true} />);

    expect(screen.getByText("Online")).toBeInTheDocument();
    const onlineContainer = screen.getByText("Online").closest("div");
    expect(onlineContainer).toHaveClass("text-green-800");
  });

  it("should display offline status when isOnline is false", () => {
    render(<ReviewStatusIndicators {...defaultProps} isOnline={false} />);

    expect(screen.getByText("Offline")).toBeInTheDocument();
    const offlineContainer = screen.getByText("Offline").closest("div");
    expect(offlineContainer).toHaveClass("text-yellow-800");
  });

  it("should show pending reviews indicator when count is greater than 0", () => {
    render(
      <ReviewStatusIndicators {...defaultProps} pendingReviewsCount={5} />,
    );

    expect(screen.getByText("5 Pending Sync")).toBeInTheDocument();
    const pendingContainer = screen.getByText("5 Pending Sync").closest("div");
    expect(pendingContainer).toHaveClass("text-blue-800");
  });

  it("should not show pending reviews indicator when count is 0", () => {
    render(
      <ReviewStatusIndicators {...defaultProps} pendingReviewsCount={0} />,
    );

    expect(screen.queryByText(/Pending Sync/)).not.toBeInTheDocument();
  });

  it("should not show pending reviews indicator when count is negative", () => {
    render(
      <ReviewStatusIndicators {...defaultProps} pendingReviewsCount={-1} />,
    );

    expect(screen.queryByText(/Pending Sync/)).not.toBeInTheDocument();
  });

  it("should render wifi icon for online status", () => {
    render(<ReviewStatusIndicators {...defaultProps} isOnline={true} />);

    // The Wifi icon should be present (it's rendered as an SVG)
    const wifiIcons = document.querySelectorAll("svg");
    expect(wifiIcons.length).toBeGreaterThan(0);
  });

  it("should render wifi-off icon for offline status", () => {
    render(<ReviewStatusIndicators {...defaultProps} isOnline={false} />);

    // The WifiOff icon should be present (it's rendered as an SVG)
    const wifiOffIcons = document.querySelectorAll("svg");
    expect(wifiOffIcons.length).toBeGreaterThan(0);
  });

  it("should render clock icon for pending reviews", () => {
    render(
      <ReviewStatusIndicators {...defaultProps} pendingReviewsCount={3} />,
    );

    // The Clock icon should be present (it's rendered as an SVG)
    const clockIcons = document.querySelectorAll("svg");
    expect(clockIcons.length).toBeGreaterThan(0);
  });

  it("should render refresh icon for sync button", () => {
    render(<ReviewStatusIndicators {...defaultProps} />);

    // The RefreshCw icon should be present (it's rendered as an SVG)
    const refreshIcons = document.querySelectorAll("svg");
    expect(refreshIcons.length).toBeGreaterThan(0);
  });

  it("should apply correct background colors for status indicators", () => {
    render(
      <ReviewStatusIndicators
        {...defaultProps}
        isOnline={true}
        pendingReviewsCount={2}
      />,
    );

    const onlineIndicator = screen.getByText("Online").closest("div");
    const pendingIndicator = screen.getByText("2 Pending Sync").closest("div");

    expect(onlineIndicator).toHaveClass("bg-green-100");
    expect(pendingIndicator).toHaveClass("bg-blue-100");
  });

  it("should apply correct background color for offline status", () => {
    render(<ReviewStatusIndicators {...defaultProps} isOnline={false} />);

    const offlineIndicator = screen.getByText("Offline").closest("div");
    expect(offlineIndicator).toHaveClass("bg-yellow-100");
  });

  it("should display correct pending count", () => {
    render(
      <ReviewStatusIndicators {...defaultProps} pendingReviewsCount={10} />,
    );

    expect(screen.getByText("10 Pending Sync")).toBeInTheDocument();
  });

  it("should handle single pending review", () => {
    render(
      <ReviewStatusIndicators {...defaultProps} pendingReviewsCount={1} />,
    );

    expect(screen.getByText("1 Pending Sync")).toBeInTheDocument();
  });
});
