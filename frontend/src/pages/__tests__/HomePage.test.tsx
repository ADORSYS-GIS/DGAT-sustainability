import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import { Welcome } from "../HomePage";

// Note: Make sure your Vitest config sets test.environment = 'jsdom'
describe("HomePage", () => {
  it("renders the main heading", () => {
    render(
      <MemoryRouter>
        <Welcome />
      </MemoryRouter>,
    );
  });
});
