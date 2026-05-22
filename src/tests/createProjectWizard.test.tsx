import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreateProjectWizard } from "@/components/projects/CreateProjectWizard";
import { WIZARD_STEP_LABELS } from "@/types/createProjectWizard";

describe("CreateProjectWizard", () => {
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

  it("renders title, source step, and live review panel", () => {
    render(
      <CreateProjectWizard
        open
        onOpenChange={vi.fn()}
        initialState={{ projectName: "Sharma 5kW", leadPath: "MSS_DIRECT" }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Create Project" })).toBeTruthy();
    expect(screen.getByTestId("wizard-source-step")).toBeTruthy();
    expect(screen.getByTestId("wizard-review-project").textContent).toBe("Sharma 5kW");
    expect(screen.getByTestId("wizard-review-kind").textContent).toBe("Solo");
  });

  it("disables Create until all visible steps validate", () => {
    render(<CreateProjectWizard open onOpenChange={vi.fn()} />);
    const createBtn = screen.getByTestId("wizard-create") as HTMLButtonElement;
    expect(createBtn.disabled).toBe(true);
  });

  it("enables Create for a fully valid MSS direct draft", () => {
    render(
      <CreateProjectWizard
        open
        onOpenChange={vi.fn()}
        initialState={{
          source: "new",
          leadPath: "MSS_DIRECT",
          customerMode: "select",
          selectedCustomerId: "C-001",
          projectName: "Sharma 5kW",
          capacity: "5 kW",
          contractAmount: 250000,
          paymentType: "cash",
        }}
        catalog={{ customers: [{ id: "C-001", name: "Sharma Family" }] }}
      />,
    );

    const createBtn = screen.getByTestId("wizard-create") as HTMLButtonElement;
    expect(createBtn.disabled).toBe(false);
    expect(screen.getByTestId("wizard-review-client").textContent).toBe("Sharma Family");
  });

  it("formats contract value in review panel with Indian grouping (Mn14)", () => {
    render(
      <CreateProjectWizard
        open
        onOpenChange={vi.fn()}
        initialState={{
          source: "new",
          leadPath: "MSS_DIRECT",
          customerMode: "select",
          selectedCustomerId: "C-001",
          projectName: "Sharma 5kW",
          capacity: "5 kW",
          contractAmount: 1234567,
          paymentType: "cash",
        }}
        catalog={{ customers: [{ id: "C-001", name: "Sharma Family" }] }}
      />,
    );

    expect(screen.getByTestId("wizard-review-contract").textContent).toBe("₹12,34,567");
  });

  it("navigates Next and Back across visible steps", () => {
    render(
      <CreateProjectWizard
        open
        onOpenChange={vi.fn()}
        initialState={{ source: "new" }}
      />,
    );

    expect(screen.getByTestId("wizard-step-content-SOURCE")).toBeTruthy();
    fireEvent.click(screen.getByTestId("wizard-next"));
    expect(screen.getByTestId("wizard-step-content-LEAD_PATH")).toBeTruthy();
    expect(screen.getByTestId("wizard-step-heading").textContent).toBe(WIZARD_STEP_LABELS.LEAD_PATH);

    fireEvent.click(screen.getByTestId("wizard-back"));
    expect(screen.getByTestId("wizard-step-content-SOURCE")).toBeTruthy();
  });

  it("shows validation errors when Next fails on LEAD_PATH", () => {
    render(
      <CreateProjectWizard
        open
        onOpenChange={vi.fn()}
        initialState={{ source: "new" }}
      />,
    );

    fireEvent.click(screen.getByTestId("wizard-next"));
    fireEvent.click(screen.getByTestId("wizard-next"));

    expect(screen.getByTestId("wizard-step-errors")).toBeTruthy();
    expect(screen.getByText(/Select how this project came to you/i)).toBeTruthy();
    expect(screen.getByTestId("wizard-lead-path-step")).toBeTruthy();
  });

  it("greys out LEAD_PATH in nav for quotation source", () => {
    render(
      <CreateProjectWizard
        open
        onOpenChange={vi.fn()}
        initialState={{ source: "quotation", selectedQuotationId: "Q-1" }}
        catalog={{ quotations: [{ id: "Q-1", status: "approved" }] }}
      />,
    );

    const leadNav = screen.getByTestId("wizard-step-nav-LEAD_PATH") as HTMLButtonElement;
    expect(leadNav.className).toMatch(/opacity-40/);
    expect(leadNav.disabled).toBe(true);
  });

  it("updates review kind when partner type changes via renderStepContent", () => {
    render(
      <CreateProjectWizard
        open
        onOpenChange={vi.fn()}
        initialState={{ source: "new", leadPath: "PARTNER", partnerType: "profit_share" }}
        renderStepContent={(_step, state, updateState) => (
          <button
            type="button"
            data-testid="switch-fixed-rate"
            onClick={() => updateState({ partnerType: "fixed_rate" })}
          >
            Switch to fixed rate ({state.partnerType})
          </button>
        )}
      />,
    );

    expect(screen.getByTestId("wizard-review-kind").textContent).toBe("Partner");
    fireEvent.click(screen.getByTestId("switch-fixed-rate"));
    expect(screen.getByTestId("wizard-review-kind").textContent).toBe("Fixed");
  });

  it("calls onCreate with wizard state when valid", async () => {
    const onCreate = vi.fn();
    render(
      <CreateProjectWizard
        open
        onOpenChange={vi.fn()}
        onCreate={onCreate}
        catalog={{
          projects: [{ id: "P-100", name: "Target project", client: "Acme", capacity: "5 kW" }],
          partners: [{ id: "SUB-1", name: "Install Co", type: "Subcontractor", phone: "", createdAt: "" }],
        }}
        initialState={{
          source: "attach_outsourced",
          attachToProjectId: "P-100",
          selectedSubcontractorId: "SUB-1",
          outsourceRateBasis: "fixed",
          outsourceRateValue: 25000,
        }}
      />,
    );

    fireEvent.click(screen.getByTestId("wizard-create"));
    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate.mock.calls[0][0].attachToProjectId).toBe("P-100");
    expect(onCreate.mock.calls[0][0].selectedSubcontractorId).toBe("SUB-1");
  });
});
