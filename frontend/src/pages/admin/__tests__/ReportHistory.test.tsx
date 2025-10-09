import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReportHistory } from "../ReportHistory";
import { I18nextProvider } from "react-i18next";
import i18n from "@/i18n";

vi.mock("@/hooks/useOfflineApi", () => ({
  useOfflineSyncStatus: () => ({ isOnline: true }),
}));

describe("ReportHistory", () => {
  it("renders title and empty state", async () => {
    vi.spyOn(global, "fetch" as any).mockResolvedValue({
      ok: true,
      json: async () => ({ reports: [] }),
    } as any);

    render(
      <I18nextProvider i18n={i18n}>
        <ReportHistory />
      </I18nextProvider>
    );

    expect(await screen.findByText(/Report History|Historique des rapports/i)).toBeInTheDocument();
  });
});


