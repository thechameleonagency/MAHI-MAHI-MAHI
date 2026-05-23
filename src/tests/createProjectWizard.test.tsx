import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CreateProjectWizard } from "@/components/projects/CreateProjectWizard";

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

  it("renders title, deal structure step for intake, and live review panel", () => {
    render(
      <CreateProjectWizard
        open
        onOpenChange={vi.fn()}
        initialState={{ projectName: "Sharma 5kW", leadPath: "MSS_DIRECT" }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Create Project" })).toBeTruthy();
    expect(screen.getByTestId("wizard-lead-path-step")).toBeTruthy();
    expect(screen.getByTestId("wizard-review-project").textContent).toBe("Sharma 5kW");
    expect(screen.getByTestId("wizard-review-kind").textContent).toBe("Solo");
  });

  it("disables Create until all visible steps validate", () => {
    render(<CreateProjectWizard open onOpenChange={vi.fn()} />);
    const createBtn = screen.getByTestId("wizard-create") as HTMLButtonElement;
    expect(createBtn.disabled).toBe(true);
  });

  it("enables Create for a fully valid intake MSS direct draft", () => {
    render(
      <CreateProjectWizard
        open
        onOpenChange={vi.fn()}
        initialState={{
          flow: "intake",
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

  it("navigates Next from deal structure to parties when lead path is selected", () => {
    render(
      <CreateProjectWizard
        open
        onOpenChange={vi.fn()}
        initialState={{ flow: "intake", leadPath: "MSS_DIRECT" }}
      />,
    );

    expect(screen.getByTestId("wizard-step-content-DEAL_TYPE")).toBeTruthy();
    fireEvent.click(screen.getByTestId("wizard-next"));
    expect(screen.getByTestId("wizard-step-content-PARTIES")).toBeTruthy();
    expect(screen.getByTestId("wizard-step-heading").textContent).toBe("Parties & site");
  });

  it("keeps Create disabled until deal structure is selected on intake", () => {
    render(<CreateProjectWizard open onOpenChange={vi.fn()} initialState={{ flow: "intake" }} />);

    expect((screen.getByTestId("wizard-create") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByTestId("wizard-next")).toBeNull();
  });

  it("shows partner network type options under Partner lead path", () => {
    render(
      <CreateProjectWizard
        open
        onOpenChange={vi.fn()}
        initialState={{ flow: "intake", leadPath: "PARTNER" }}
      />,
    );

    expect(screen.getByTestId("wizard-partner-type-vendor_channel")).toBeTruthy();
    expect(screen.getByText("Vendor Channel")).toBeTruthy();
    expect(screen.queryByText("Vendor Network")).toBeNull();
  });

  it("calls onCreate with wizard state when attach flow is valid", async () => {
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
          flow: "attach",
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
  });
});
