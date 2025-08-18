import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OfflineStatusCard } from "../OfflineStatusCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const map: Record<string, string> = {
        "assessment.offlineMode":
          "You are offline. Your responses will be saved locally and synced when you come back online.",
        "assessment.onlineWithPending":
          "You are online. Syncing pending submissions...",
        "assessment.pendingSubmissions": "Pending submissions:",
      };
      return map[key] ?? key;
    },
  }),
}));

describe("OfflineStatusCard", () => {
  it("renders offline status when not online", () => {
    render(<OfflineStatusCard isOnline={false} pendingSubmissions={[]} />);

    expect(
      screen.getByText(
        "You are offline. Your responses will be saved locally and synced when you come back online.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sync now/i }),
    ).toBeInTheDocument();
  });

  it("shows pending submissions count when offline", () => {
    const pendingSubmissions = [{ id: "1" }, { id: "2" }] as any[];
    render(
      <OfflineStatusCard
        isOnline={false}
        pendingSubmissions={pendingSubmissions}
      />,
    );

    expect(screen.getByText("Pending submissions: 2")).toBeInTheDocument();
  });

  it("renders online status with pending submissions", () => {
    const pendingSubmissions = [{ id: "1" }] as any[];
    render(
      <OfflineStatusCard
        isOnline={true}
        pendingSubmissions={pendingSubmissions}
      />,
    );

    expect(
      screen.getByText("You are online. Syncing pending submissions..."),
    ).toBeInTheDocument();
    expect(screen.getByText("Pending submissions: 1")).toBeInTheDocument();
  });

  it("returns null when online with no pending submissions", () => {
    const { container } = render(
      <OfflineStatusCard isOnline={true} pendingSubmissions={[]} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("dispatches online event when sync button is clicked", () => {
    const dispatchEventSpy = vi.spyOn(window, "dispatchEvent");
    render(<OfflineStatusCard isOnline={false} pendingSubmissions={[]} />);

    fireEvent.click(screen.getByRole("button", { name: /sync now/i }));
    expect(dispatchEventSpy).toHaveBeenCalledWith(new Event("online"));
  });
});
