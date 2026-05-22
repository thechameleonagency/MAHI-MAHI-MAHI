import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LeadPathStep } from "@/components/projects/wizard/LeadPathStep";
import { createInitialCreateProjectWizardState } from "@/types/createProjectWizard";
import type { Partner } from "@/types/finance";

function makePartner(overrides: Partial<Partner> = {}): Partner {
  return {
    id: "PTR-1",
    name: "Alpha Partners",
    phone: "9999999999",
    type: "Profit-Share",
    createdAt: "2026-01-01",
    ...overrides,
  } as Partner;
}

describe("LeadPathStep", () => {
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

  it("renders four lead path cards", () => {
    render(
      <LeadPathStep
        state={createInitialCreateProjectWizardState({ source: "new" })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("wizard-lead-path-MSS_DIRECT")).toBeTruthy();
    expect(screen.getByTestId("wizard-lead-path-PARTNER")).toBeTruthy();
    expect(screen.getByTestId("wizard-lead-path-INC_GIVEN")).toBeTruthy();
    expect(screen.getByTestId("wizard-lead-path-OUTSOURCED_INC")).toBeTruthy();
  });

  it("shows partner sub-types when PARTNER is selected", () => {
    render(
      <LeadPathStep
        state={createInitialCreateProjectWizardState({ source: "new", leadPath: "PARTNER" })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("wizard-partner-type-profit_share")).toBeTruthy();
    expect(screen.getByTestId("wizard-partner-type-fixed_rate")).toBeTruthy();
    expect(screen.getByTestId("wizard-partner-type-vendor_channel")).toBeTruthy();
    expect(screen.getByTestId("wizard-partner-type-vendorship_only")).toBeTruthy();
  });

  it("shows partner picker for profit share and fixed rate only", () => {
    const { rerender } = render(
      <LeadPathStep
        state={createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "PARTNER",
          partnerType: "profit_share",
        })}
        onChange={vi.fn()}
        catalog={{ partners: [makePartner()] }}
      />,
    );

    expect(screen.getByTestId("wizard-partner-select")).toBeTruthy();

    rerender(
      <LeadPathStep
        state={createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "PARTNER",
          partnerType: "vendor_channel",
        })}
        onChange={vi.fn()}
        catalog={{ partners: [makePartner()] }}
      />,
    );

    expect(screen.queryByTestId("wizard-partner-select")).toBeNull();
  });

  it("filters partners to profit-share and fixed-rate deal bringers", () => {
    render(
      <LeadPathStep
        state={createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "PARTNER",
          partnerType: "profit_share",
        })}
        onChange={vi.fn()}
        catalog={{
          partners: [
            makePartner({ id: "PTR-1", name: "Alpha Partners", type: "Profit-Share" }),
            makePartner({ id: "PTR-2", name: "Beta Channel", type: "Channel" }),
            makePartner({ id: "PTR-3", name: "Gamma Fixed", type: "Fixed-Rate" }),
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("combobox"));

    expect(screen.getByText("Alpha Partners")).toBeTruthy();
    expect(screen.getByText("Gamma Fixed")).toBeTruthy();
    expect(screen.queryByText("Beta Channel")).toBeNull();
  });

  it("prefills partner type and default rate when a fixed-rate partner is selected", () => {
    const onChange = vi.fn();
    render(
      <LeadPathStep
        state={createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "PARTNER",
          partnerType: "profit_share",
        })}
        onChange={onChange}
        catalog={{
          partners: [
            makePartner({
              id: "PTR-FIX",
              name: "Fixed Co",
              type: "Fixed-Rate",
              defaultRatePerKw: 65000,
            }),
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Fixed Co"));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedPartnerId: "PTR-FIX",
        partnerType: "fixed_rate",
        fixedRatePerKw: 65000,
      }),
    );
  });

  it("clears partner-specific fields when lead path changes", () => {
    const onChange = vi.fn();
    render(
      <LeadPathStep
        state={createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "PARTNER",
          partnerType: "profit_share",
          selectedPartnerId: "PTR-1",
        })}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByTestId("wizard-lead-path-MSS_DIRECT"));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        leadPath: "MSS_DIRECT",
        partnerType: undefined,
        selectedPartnerId: undefined,
      }),
    );
  });

  it("shows outsource mode options for OUTSOURCED_INC", () => {
    render(
      <LeadPathStep
        state={createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "OUTSOURCED_INC",
          outsourceMode: "existing",
        })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("wizard-outsource-mode-new")).toBeTruthy();
    expect(screen.getByTestId("wizard-outsource-mode-existing")).toBeTruthy();
    expect(screen.getByTestId("wizard-outsource-existing-hint")).toBeTruthy();
  });
});
