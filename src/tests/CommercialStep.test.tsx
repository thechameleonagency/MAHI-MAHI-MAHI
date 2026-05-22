import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CommercialStep } from "@/components/projects/wizard/CommercialStep";
import { createInitialCreateProjectWizardState } from "@/types/createProjectWizard";
import type { Loan } from "@/types/finance";

function makeLoan(overrides: Partial<Loan> = {}): Loan {
  return {
    id: "LN-1",
    source: "HDFC",
    sourceType: "bank",
    personName: "Sharma",
    principal: 500000,
    interestRate: 10,
    paymentType: "emi",
    emiAmount: 15000,
    tenure: 36,
    startDate: "2026-01-01",
    outstanding: 400000,
    status: "Active",
    ...overrides,
  } as Loan;
}

describe("CommercialStep", () => {
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

  it("shows locked message when lead path is unresolved", () => {
    render(
      <CommercialStep
        state={createInitialCreateProjectWizardState({ source: "new" })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("wizard-commercial-step-locked")).toBeTruthy();
  });

  it("renders MSS direct commercial fields", () => {
    render(
      <CommercialStep
        state={createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "MSS_DIRECT",
        })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("wizard-project-name")).toBeTruthy();
    expect(screen.getByTestId("wizard-capacity")).toBeTruthy();
    expect(screen.getByTestId("wizard-contract-amount")).toBeTruthy();
    expect(screen.getByTestId("wizard-payment-type")).toBeTruthy();
  });

  it("shows funding loan select when payment type is loan", () => {
    render(
      <CommercialStep
        state={createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "MSS_DIRECT",
          paymentType: "loan",
        })}
        onChange={vi.fn()}
        catalog={{ loans: [makeLoan()] }}
      />,
    );

    expect(screen.getByTestId("wizard-funding-loan")).toBeTruthy();
  });

  it("clears funding loan when payment type switches to cash", () => {
    const onChange = vi.fn();
    render(
      <CommercialStep
        state={createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "MSS_DIRECT",
          paymentType: "loan",
          fundingLoanId: "LN-1",
        })}
        onChange={onChange}
        catalog={{ loans: [makeLoan()] }}
      />,
    );

    fireEvent.click(screen.getByTestId("wizard-payment-type"));
    fireEvent.click(screen.getByText("Cash"));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentType: "cash",
        fundingLoanId: undefined,
      }),
    );
  });

  it("renders partner commercial and profit share fields", () => {
    render(
      <CommercialStep
        state={createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "PARTNER",
          partnerType: "profit_share",
        })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("wizard-partner-project-name")).toBeTruthy();
    expect(screen.getByTestId("wizard-partner-capacity")).toBeTruthy();
    expect(screen.getByTestId("wizard-partner-contract-amount")).toBeTruthy();
    expect(screen.getByTestId("wizard-profit-share")).toBeTruthy();
    expect(screen.queryByTestId("wizard-fixed-rate")).toBeNull();
  });

  it("renders fixed rate field for fixed-rate partner path", () => {
    render(
      <CommercialStep
        state={createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "PARTNER",
          partnerType: "fixed_rate",
        })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("wizard-fixed-rate")).toBeTruthy();
    expect(screen.queryByTestId("wizard-profit-share")).toBeNull();
  });

  it("renders INC given rate basis and live total", () => {
    render(
      <CommercialStep
        state={createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "INC_GIVEN",
          rateBasis: "fixed",
          incFixedAmount: 250000,
          rateValue: 250000,
        })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("wizard-rate-basis-fixed")).toBeTruthy();
    expect(screen.getByTestId("wizard-inc-fixed-amount")).toBeTruthy();
    expect(screen.getByTestId("wizard-inc-total").textContent).toContain("2,50,000");
  });

  it("shows INC scope for outsourced INC lead path", () => {
    render(
      <CommercialStep
        state={createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "OUTSOURCED_INC",
        })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("wizard-inc-scope")).toBeTruthy();
  });
});
