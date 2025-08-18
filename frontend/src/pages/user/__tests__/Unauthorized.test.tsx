import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Unauthorized from "../Unauthorized";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

describe("Unauthorized Page", () => {
  it("renders message and button", () => {
    render(<Unauthorized />);

    expect(screen.getByText("Access Denied")).toBeInTheDocument();
    expect(
      screen.getByText("You do not have permission to view this page."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /go to home/i }),
    ).toBeInTheDocument();
  });
});
