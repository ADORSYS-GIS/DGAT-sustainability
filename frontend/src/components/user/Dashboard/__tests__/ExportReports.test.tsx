import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExportReports } from "../ExportReports";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "user.dashboard.exportReports": "Export Reports",
        "user.dashboard.downloadReportsDescription":
          "Download your assessment reports as PDF.",
        "user.dashboard.exportAsPDF": "Export as PDF",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("ExportReports", () => {
  const defaultProps = {
    onExportPDF: vi.fn(),
    isLoading: false,
    hasReports: true,
  };

  it("renders export reports title and description", () => {
    render(<ExportReports {...defaultProps} />);

    expect(screen.getByText("Export Reports")).toBeInTheDocument();
    expect(
      screen.getByText("Download your assessment reports as PDF."),
    ).toBeInTheDocument();
  });

  it("renders export PDF button", () => {
    render(<ExportReports {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: /export as pdf/i }),
    ).toBeInTheDocument();
  });

  it("calls onExportPDF when button is clicked", () => {
    const onExportPDF = vi.fn();
    render(<ExportReports {...defaultProps} onExportPDF={onExportPDF} />);

    fireEvent.click(screen.getByRole("button", { name: /export as pdf/i }));
    expect(onExportPDF).toHaveBeenCalledTimes(1);
  });

  it("disables button when loading", () => {
    render(<ExportReports {...defaultProps} isLoading={true} />);

    const button = screen.getByRole("button", { name: /export as pdf/i });
    expect(button).toBeDisabled();
  });

  it("disables button when no reports available", () => {
    render(<ExportReports {...defaultProps} hasReports={false} />);

    const button = screen.getByRole("button", { name: /export as pdf/i });
    expect(button).toBeDisabled();
  });
});
