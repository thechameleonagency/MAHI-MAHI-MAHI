import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SourceStep } from "@/components/projects/wizard/SourceStep";
import { createInitialCreateProjectWizardState } from "@/types/createProjectWizard";
import type { Project, Quotation } from "@/types/project";

function makeQuotation(overrides: Partial<Quotation> = {}): Quotation {
  return {
    id: "Q-1",
    quotationNumber: "QT-001",
    status: "approved",
    quotationType: "solar",
    clientName: "Sharma Family",
    clientPhone: "9999999999",
    clientEmail: "sharma@example.com",
    clientCity: "Delhi",
    clientState: "Delhi",
    systemCapacity: "5",
    systemCategory: "residential",
    grandTotal: 250000,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    ...overrides,
  } as Quotation;
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "P-100",
    name: "Sharma 5kW",
    client: "Sharma Family",
    lifecycleStatus: "In Progress",
    contractAmount: 250000,
    capacity: "5 kW",
    location: "Delhi",
    ...overrides,
  } as Project;
}

describe("SourceStep", () => {
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

  it("renders all four source options when direct exception is allowed", () => {
    render(
      <SourceStep
        state={createInitialCreateProjectWizardState()}
        onChange={vi.fn()}
        catalog={{ canDirectException: true }}
      />,
    );

    expect(screen.getByText("New project")).toBeTruthy();
    expect(screen.getByText("From approved quotation")).toBeTruthy();
    expect(screen.getByText("Direct exception")).toBeTruthy();
    expect(screen.getByText("Attach outsourced INC")).toBeTruthy();
  });

  it("hides direct exception when permission is denied", () => {
    render(
      <SourceStep
        state={createInitialCreateProjectWizardState()}
        onChange={vi.fn()}
        catalog={{ canDirectException: false }}
      />,
    );

    expect(screen.queryByText("Direct exception")).toBeNull();
  });

  it("shows quotation picker filtered to eligible quotations only", () => {
    render(
      <SourceStep
        state={createInitialCreateProjectWizardState({ source: "quotation" })}
        onChange={vi.fn()}
        catalog={{
          quotations: [
            makeQuotation({ id: "Q-1", clientName: "Eligible Client" }),
            makeQuotation({ id: "Q-2", status: "sent", clientName: "Sent Client" }),
            makeQuotation({ id: "Q-3", linkedProjectId: "P-9", clientName: "Converted Client" }),
          ],
        }}
      />,
    );

    expect(screen.getByTestId("wizard-quotation-picker-item-Q-1")).toBeTruthy();
    expect(screen.queryByTestId("wizard-quotation-picker-item-Q-2")).toBeNull();
    expect(screen.queryByTestId("wizard-quotation-picker-item-Q-3")).toBeNull();
  });

  it("prefills wizard state when a quotation is selected", () => {
    const onChange = vi.fn();
    render(
      <SourceStep
        state={createInitialCreateProjectWizardState({ source: "quotation" })}
        onChange={onChange}
        catalog={{
          quotations: [makeQuotation({ id: "Q-1", customerId: "C-001" })],
          customers: [{ id: "C-001", name: "Sharma Family", status: "Active" } as never],
        }}
      />,
    );

    fireEvent.click(screen.getByTestId("wizard-quotation-picker-item-Q-1"));

    expect(onChange).toHaveBeenCalledTimes(1);
    const patch = onChange.mock.calls[0][0];
    expect(patch.selectedQuotationId).toBe("Q-1");
    expect(patch.projectName).toContain("Sharma Family");
    expect(patch.customerMode).toBe("select");
    expect(patch.selectedCustomerId).toBe("C-001");
  });

  it("shows direct exception reason and kind fields", () => {
    render(
      <SourceStep
        state={createInitialCreateProjectWizardState({ source: "direct_exception" })}
        onChange={vi.fn()}
        catalog={{ canDirectException: true }}
      />,
    );

    expect(screen.getByTestId("wizard-direct-exception-reason")).toBeTruthy();
    expect(screen.getByTestId("wizard-direct-exception-kind")).toBeTruthy();
  });

  it("shows open project picker for attach outsourced source", () => {
    render(
      <SourceStep
        state={createInitialCreateProjectWizardState({ source: "attach_outsourced" })}
        onChange={vi.fn()}
        catalog={{
          projects: [
            makeProject({ id: "P-100", name: "Open Project" }),
            makeProject({ id: "P-200", name: "Done Project", lifecycleStatus: "Completed" }),
          ],
        }}
      />,
    );

    expect(screen.getByTestId("wizard-project-picker-item-P-100")).toBeTruthy();
    expect(screen.queryByTestId("wizard-project-picker-item-P-200")).toBeNull();
  });

  it("filters quotations by search query", () => {
    render(
      <SourceStep
        state={createInitialCreateProjectWizardState({ source: "quotation" })}
        onChange={vi.fn()}
        catalog={{
          quotations: [
            makeQuotation({ id: "Q-1", clientName: "Alpha Solar" }),
            makeQuotation({ id: "Q-2", clientName: "Beta Homes" }),
          ],
        }}
      />,
    );

    fireEvent.change(screen.getByTestId("wizard-quotation-picker-search"), {
      target: { value: "beta" },
    });

    expect(screen.queryByTestId("wizard-quotation-picker-item-Q-1")).toBeNull();
    expect(screen.getByTestId("wizard-quotation-picker-item-Q-2")).toBeTruthy();
  });

  it("clears source-specific fields when switching source", () => {
    const onChange = vi.fn();
    render(
      <SourceStep
        state={createInitialCreateProjectWizardState({
          source: "quotation",
          selectedQuotationId: "Q-1",
        })}
        onChange={onChange}
        catalog={{ quotations: [makeQuotation()] }}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: /New project/i }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "new",
        selectedQuotationId: undefined,
      }),
    );
  });
});
