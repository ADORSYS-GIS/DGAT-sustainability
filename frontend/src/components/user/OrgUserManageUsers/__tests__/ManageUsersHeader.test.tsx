import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ManageUsersHeader } from "../ManageUsersHeader";

describe("OrgUserManageUsers/ManageUsersHeader", () => {
  const defaultProps = {
    orgName: "Test Org",
    onBackToDashboard: vi.fn(),
    onAddUser: vi.fn(),
  };

  it("renders back and add buttons plus org name", () => {
    render(<ManageUsersHeader {...defaultProps} />);

    expect(
      screen.getByRole("button", { name: /back to dashboard/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /\+ add user/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Test Org")).toBeInTheDocument();
  });

  it("calls handlers on clicks", () => {
    const onBack = vi.fn();
    const onAdd = vi.fn();
    render(
      <ManageUsersHeader
        orgName="Test Org"
        onBackToDashboard={onBack}
        onAddUser={onAdd}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /back to dashboard/i }));
    fireEvent.click(screen.getByRole("button", { name: /\+ add user/i }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});
