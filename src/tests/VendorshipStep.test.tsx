import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VendorshipStep } from "@/components/projects/wizard/VendorshipStep";
import { createInitialCreateProjectWizardState } from "@/types/createProjectWizard";
import type { VendorshipCompany } from "@/types/finance";

function makeVendorshipCompany(overrides: Partial<VendorshipCompany> = {}): VendorshipCompany {
  return {
    id: "VC-1",
    name: "Solar Code Co",
    phone: "9999999999",
    createdAt: "2026-01-01",
    ...overrides,
  } as VendorshipCompany;
}

describe("VendorshipStep", () => {
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

  it("shows skipped message when vendorship does not apply", () => {
    render(
      <VendorshipStep
        state={createInitialCreateProjectWizardState({
          source: "new",
          leadPath: "INC_GIVEN",
        })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByTestId("wizard-vendorship-step-skipped")).toBeTruthy();
  });

  it("renders direct vendorship choices for MSS direct path", () => {
    render(
      <VendorshipStep
        state={createInitialCreateProjectWizardState({
          flow: "intake",
          leadPath: "MSS_DIRECT",
        })}
        onChange={vi.fn()}
        catalog={{ vendorshipCompanies: [makeVendorshipCompany()] }}
      />,
    );

    expect(screen.getByTestId("wizard-vendorship-choice-OUR_CODE")).toBeTruthy();
    expect(screen.getByTestId("wizard-vendorship-choice-THIRD_PARTY")).toBeTruthy();
  });

  it("shows third-party company and fee fields when third-party is selected", () => {
    render(
      <VendorshipStep
        state={createInitialCreateProjectWizardState({
          flow: "intake",
          leadPath: "MSS_DIRECT",
          vendorshipChoice: "THIRD_PARTY",
        })}
        onChange={vi.fn()}
        catalog={{ vendorshipCompanies: [makeVendorshipCompany()] }}
      />,
    );

    expect(screen.getByTestId("wizard-vendorship-company")).toBeTruthy();
    expect(screen.getByTestId("wizard-vendorship-fee")).toBeTruthy();
  });

  it("clears third-party fields when switching to our code", () => {
    const onChange = vi.fn();
    render(
      <VendorshipStep
        state={createInitialCreateProjectWizardState({
          flow: "intake",
          leadPath: "MSS_DIRECT",
          vendorshipChoice: "THIRD_PARTY",
          vendorshipCompanyId: "VC-1",
          vendorshipFeeAmount: 25000,
        })}
        onChange={onChange}
        catalog={{ vendorshipCompanies: [makeVendorshipCompany()] }}
      />,
    );

    fireEvent.click(screen.getByTestId("wizard-vendorship-choice-OUR_CODE"));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        vendorshipChoice: "OUR_CODE",
        vendorshipCompanyId: undefined,
        vendorshipFeeAmount: undefined,
      }),
    );
  });

  it("renders partner billing, GST, and vendorship fields", () => {
    render(
      <VendorshipStep
        state={createInitialCreateProjectWizardState({
          flow: "intake",
          leadPath: "PARTNER",
          partnerType: "profit_share",
          selectedPartnerId: "P-1",
        })}
        onChange={vi.fn()}
        catalog={{ vendorshipCompanies: [makeVendorshipCompany()] }}
      />,
    );

    expect(screen.getByTestId("wizard-billing-party-MSS")).toBeTruthy();
    expect(screen.getByTestId("wizard-billing-party-PARTNER")).toBeTruthy();
    expect(screen.getByTestId("wizard-partner-gst-yes")).toBeTruthy();
    expect(screen.getByTestId("wizard-partner-vendorship-choice-OUR_CODE")).toBeTruthy();
  });

  it("shows partner third-party vendorship fields when selected", () => {
    render(
      <VendorshipStep
        state={createInitialCreateProjectWizardState({
          flow: "intake",
          leadPath: "PARTNER",
          partnerType: "fixed_rate",
          selectedPartnerId: "P-1",
          partnerVendorshipChoice: "THIRD_PARTY",
        })}
        onChange={vi.fn()}
        catalog={{ vendorshipCompanies: [makeVendorshipCompany()] }}
      />,
    );

    expect(screen.getByTestId("wizard-partner-third-party-company")).toBeTruthy();
    expect(screen.getByTestId("wizard-partner-third-party-fee")).toBeTruthy();
  });

  it("shows direct vendorship for quotation source", () => {
    render(
      <VendorshipStep
        state={createInitialCreateProjectWizardState({
          flow: "quotation",
          source: "quotation",
          selectedQuotationId: "Q-1",
        })}
        onChange={vi.fn()}
        catalog={{ vendorshipCompanies: [makeVendorshipCompany()] }}
      />,
    );

    expect(screen.getByTestId("wizard-vendorship-step")).toBeTruthy();
    expect(screen.getByTestId("wizard-vendorship-choice-OUR_CODE")).toBeTruthy();
  });

  it("shows GST offset warning when partner does not invoice", () => {
    render(
      <VendorshipStep
        state={createInitialCreateProjectWizardState({
          flow: "intake",
          leadPath: "PARTNER",
          partnerType: "profit_share",
          selectedPartnerId: "P-1",
          partnerGstInvoice: "no",
        })}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/9% will be deducted/i)).toBeTruthy();
  });
});
