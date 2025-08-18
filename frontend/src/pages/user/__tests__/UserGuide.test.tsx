import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserGuide } from "../UserGuide";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options?.returnObjects) return ["Item 1", "Item 2"];
      return key;
    },
  }),
}));

describe("UserGuide Page", () => {
  it("renders title and subtitle", () => {
    render(<UserGuide />);

    expect(screen.getByText("userGuide.title")).toBeInTheDocument();
    expect(screen.getByText("userGuide.subtitle")).toBeInTheDocument();
  });
});
