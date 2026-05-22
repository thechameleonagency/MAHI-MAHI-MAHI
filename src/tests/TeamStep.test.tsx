import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TeamStep } from "@/components/projects/wizard/TeamStep";
import { createInitialCreateProjectWizardState } from "@/types/createProjectWizard";
import type { Employee } from "@/types/project";

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: "EMP-1",
    name: "Priya Sharma",
    initial: "P",
    role: "Site Lead",
    phone: "9999999999",
    status: "Active",
    site: "HQ",
    salary: 30000,
    wallet: 0,
    joiningDate: "2026-01-01",
    daysPresent: 0,
    daysAbsent: 0,
    holidays: 0,
    ...overrides,
  } as Employee;
}

describe("TeamStep", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders assignee select and target end date", () => {
    render(
      <TeamStep
        state={createInitialCreateProjectWizardState()}
        onChange={vi.fn()}
        catalog={{ employees: [makeEmployee()] }}
      />,
    );

    expect(screen.getByTestId("wizard-primary-assignee")).toBeTruthy();
    expect(screen.getByTestId("wizard-target-end-date")).toBeTruthy();
  });

  it("filters inactive employees from the picker", () => {
    render(
      <TeamStep
        state={createInitialCreateProjectWizardState()}
        onChange={vi.fn()}
        catalog={{
          employees: [
            makeEmployee({ id: "EMP-1", name: "Active Lead" }),
            makeEmployee({ id: "EMP-2", name: "Inactive Lead", status: "Inactive" }),
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByText("Active Lead")).toBeTruthy();
    expect(screen.queryByText("Inactive Lead")).toBeNull();
  });

  it("clears assignee and end date when Assign later is selected", () => {
    const onChange = vi.fn();
    render(
      <TeamStep
        state={createInitialCreateProjectWizardState({
          primaryAssigneeId: "EMP-1",
          targetEndDate: "2026-12-31",
        })}
        onChange={onChange}
        catalog={{ employees: [makeEmployee()] }}
      />,
    );

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Assign later"));

    expect(onChange).toHaveBeenCalledWith({
      primaryAssigneeId: undefined,
      targetEndDate: undefined,
    });
  });
});
