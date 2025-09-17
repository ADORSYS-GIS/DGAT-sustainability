import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Dashboard } from "../Dashboard";
import * as offlineApi from "@/hooks/useOfflineApi";
import * as exportPDFModule from "@/utils/exportPDF";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";

const wrap = (ui: React.ReactElement) => (
  <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
);

describe("Dashboard export flow", () => {
  it("opens report dialog and exports selected report", async () => {
    vi.spyOn(offlineApi, "useOfflineReports").mockReturnValue({
      data: {
        recommendations: [],
        reports: [
          {
            report_id: "r-123",
            submission_id: "s-1",
            status: "completed",
            generated_at: new Date().toISOString(),
            report_type: "sustainability",
            data: [{}],
          } as any,
        ],
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.spyOn(offlineApi, "useOfflineSubmissions").mockReturnValue({ data: { submissions: [] }, isLoading: false } as any);
    vi.spyOn(offlineApi, "useOfflineAdminSubmissions").mockReturnValue({ data: { submissions: [] }, isLoading: false } as any);
    vi.spyOn(offlineApi, "useOfflineAssessments").mockReturnValue({ data: { assessments: [] }, isLoading: false } as any);
    vi.spyOn(offlineApi, "useOfflineUserRecommendations").mockReturnValue({ data: { recommendations: [] }, isLoading: false } as any);

    const exportSpy = vi.spyOn(exportPDFModule, "exportReportPDF").mockResolvedValue();

    render(wrap(<Dashboard />));

    // Click Export as PDF to open dialog
    fireEvent.click(screen.getByRole("button", { name: /Export as PDF/i }));

    // Click Select on the single report
    const selectBtn = await screen.findByRole("button", { name: /Select/i });
    fireEvent.click(selectBtn);

    await waitFor(() => expect(exportSpy).toHaveBeenCalledTimes(1));
    expect(exportSpy.mock.calls[0][0]).toMatchObject({ report_id: "r-123" });
  });
});

