import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminGuide } from "../AdminGuide";

// Mock react-router-dom
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options?.returnObjects) {
        return ["Mock content 1", "Mock content 2"];
      }
      return key;
    },
  }),
}));

// Mock the hook
vi.mock("@/hooks/useOfflineApi", () => ({
  useOfflineSyncStatus: () => ({
    isOnline: true,
  }),
}));

describe("AdminGuide", () => {
  it("renders admin guide page", () => {
    render(<AdminGuide />);

    // Check for the main guide content
    expect(
      screen.getByText("adminGuide.sections.overview.title"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("adminGuide.sections.organizations.title"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("adminGuide.sections.users.title"),
    ).toBeInTheDocument();
  });
});
