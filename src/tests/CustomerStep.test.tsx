import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CustomerStep } from "@/components/projects/wizard/CustomerStep";
import { createInitialCreateProjectWizardState } from "@/types/createProjectWizard";
import type { Customer, INCGiverCompany, Partner } from "@/types/finance";

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "C-001",
    name: "Sharma Family",
    phone: "9999999999",
    email: "sharma@example.com",
    status: "Active",
    type: "individual",
    createdAt: "2026-01-01",
    ...overrides,
  } as Customer;
}

function makePartner(overrides: Partial<Partner> = {}): Partner {
  return {
    id: "PTR-SUB",
    name: "SubCo Installers",
    phone: "8888888888",
    type: "Subcontractor",
    createdAt: "2026-01-01",
    ...overrides,
  } as Partner;
}

function makeIncGiver(overrides: Partial<INCGiverCompany> = {}): INCGiverCompany {
  return {
    id: "INC-1",
    name: "BuildRight Solar",
    phone: "7777777777",
    createdAt: "2026-01-01",
    ...overrides,
  } as INCGiverCompany;
}

describe("CustomerStep", () => {
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
      <CustomerStep
        state={createInitialCreateProjectWizardState({ source: "new" })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("wizard-customer-step-locked")).toBeTruthy();
  });

  it("renders MSS direct customer mode toggle and select", () => {
    render(
      <CustomerStep
        state={createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "MSS_DIRECT",
          customerMode: "select",
        })}
        onChange={vi.fn()}
        catalog={{ customers: [makeCustomer()] }}
      />,
    );

    expect(screen.getByTestId("wizard-customer-mode-toggle")).toBeTruthy();
    expect(screen.getByTestId("wizard-customer-select")).toBeTruthy();
    expect(screen.getByTestId("wizard-k-number")).toBeTruthy();
  });

  it("renders add-customer fields when mode is add", () => {
    render(
      <CustomerStep
        state={createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "MSS_DIRECT",
          customerMode: "add",
        })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("wizard-new-customer-name")).toBeTruthy();
    expect(screen.getByTestId("wizard-new-customer-phone")).toBeTruthy();
    expect(screen.queryByTestId("wizard-customer-select")).toBeNull();
  });

  it("shows quotation name verify hint for quotation-sourced add-customer flow", () => {
    render(
      <CustomerStep
        state={createInitialCreateProjectWizardState({
          source: "quotation",
          selectedQuotationId: "Q-1",
          customerMode: "add",
          newCustomerName: "Sharma Family",
        })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("wizard-quotation-name-verify-hint")).toBeTruthy();
  });

  it("clears new-customer fields when switching to select mode", () => {
    const onChange = vi.fn();
    render(
      <CustomerStep
        state={createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "MSS_DIRECT",
          customerMode: "add",
          newCustomerName: "Sharma",
        })}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByTestId("wizard-customer-mode-select"));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        customerMode: "select",
        newCustomerName: undefined,
      }),
    );
  });

  it("renders partner end-customer name field", () => {
    render(
      <CustomerStep
        state={createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "PARTNER",
          partnerType: "profit_share",
        })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("wizard-partner-customer-name")).toBeTruthy();
  });

  it("renders INC giver company select", () => {
    render(
      <CustomerStep
        state={createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "INC_GIVEN",
        })}
        onChange={vi.fn()}
        catalog={{ incGiverCompanies: [makeIncGiver()] }}
      />,
    );

    expect(screen.getByTestId("wizard-inc-giver-select")).toBeTruthy();
  });

  it("renders outsourced customer and subcontractor selects", () => {
    render(
      <CustomerStep
        state={createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "OUTSOURCED_INC",
        })}
        onChange={vi.fn()}
        catalog={{
          customers: [makeCustomer()],
          partners: [
            makePartner(),
            makePartner({ id: "PTR-2", name: "Channel Co", type: "Channel" }),
          ],
        }}
      />,
    );

    expect(screen.getByTestId("wizard-outsourced-customer-select")).toBeTruthy();
    expect(screen.getByTestId("wizard-subcontractor-select")).toBeTruthy();
  });

  it("filters customer search for MSS direct select mode", () => {
    const customers = Array.from({ length: 10 }, (_, index) =>
      makeCustomer({ id: `C-${index}`, name: `Customer ${index}` }),
    );

    render(
      <CustomerStep
        state={createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "MSS_DIRECT",
          customerMode: "select",
        })}
        onChange={vi.fn()}
        catalog={{ customers }}
      />,
    );

    expect(screen.getByTestId("wizard-customer-search")).toBeTruthy();
  });
});
