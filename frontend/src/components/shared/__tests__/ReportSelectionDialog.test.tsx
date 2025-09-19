import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReportSelectionDialog } from "../ReportSelectionDialog";
import type { Report } from "@/openapi-rq/requests/types.gen";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";

const wrap = (ui: React.ReactElement) => (
  <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
);

describe("ReportSelectionDialog", () => {
  const reports: Report[] = [
    {
      report_id: "r-1",
      submission_id: "s-1",
      status: "completed",
      generated_at: new Date().toISOString(),
      report_type: "sustainability",
      data: [{}],
    } as unknown as Report,
    {
      report_id: "r-2",
      submission_id: "s-2",
      status: "generating",
      generated_at: new Date().toISOString(),
      report_type: "summary",
      data: [{}],
    } as unknown as Report,
  ];

  it("renders list of reports and allows selection", () => {
    const onSelect = vi.fn();
    render(
      wrap(
        <ReportSelectionDialog
          open={true}
          onOpenChange={() => {}}
          reports={reports}
          onReportSelect={onSelect}
        />
      )
    );

    expect(screen.getByText(/Select a report/i)).toBeInTheDocument();
    // Shows both entries
    expect(screen.getByText(/Sustainability/i)).toBeInTheDocument();
    expect(screen.getByText(/Summary/i)).toBeInTheDocument();

    // Click the select button of first report
    const selectButtons = screen.getAllByRole("button", { name: /Select/i });
    fireEvent.click(selectButtons[0]);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0]).toMatchObject({ report_id: "r-1" });
  });
});

