import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { StandardRecommendations } from "../StandardRecommendations";

// Mock react-i18next
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: {
    type: "3rdParty",
    init: vi.fn(),
  },
}));

// Mock the hook
vi.mock("@/hooks/useOfflineApi", () => ({
  useOfflineSyncStatus: () => ({
    isOnline: true,
  }),
}));

// Mock idb-keyval
vi.mock("idb-keyval", () => ({
  get: vi.fn().mockResolvedValue([]),
  set: vi.fn().mockResolvedValue(undefined),
  del: vi.fn().mockResolvedValue(undefined),
}));

// Mock uuid
vi.mock("uuid", () => ({
  v4: () => "mock-uuid",
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("StandardRecommendations", () => {
  it("renders without crashing", () => {
    const { container } = render(<StandardRecommendations />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
