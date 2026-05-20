import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DirectExceptionProjectBanner } from "@/components/projects/DirectExceptionProjectBanner";

describe("DirectExceptionProjectBanner (T3)", () => {
  it("renders persisted directCreationReason via LifecycleTerminalBanner", () => {
    render(
      <MemoryRouter>
        <DirectExceptionProjectBanner
          project={{
            id: "PROJ-001",
            directCreationReason: "Board-approved mobilization",
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText(/Direct exception project/i)).toBeTruthy();
    expect(screen.getByText(/Board-approved mobilization/i)).toBeTruthy();
    expect(screen.getByText(/Audit reason:/i)).toBeTruthy();
  });

  it("uses reasonOverride when project row has not hydrated yet", () => {
    render(
      <MemoryRouter>
        <DirectExceptionProjectBanner
          project={{ id: "PROJ-NEW" }}
          reasonOverride="  Urgent site start  "
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Urgent site start/i)).toBeTruthy();
  });

  it("renders nothing without a reason", () => {
    const { container } = render(
      <MemoryRouter>
        <DirectExceptionProjectBanner project={{ id: "PROJ-PLAIN" }} />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });
});
