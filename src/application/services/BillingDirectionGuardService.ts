import type { Project } from "@/types/project";
import type { BillingDirection } from "@/domain/projectTypes/types";
import { formatINR } from "@/lib/formatCurrency";

/** Soft cap for MSS→customer invoice issuance without written justification (prototype friction gate). */
export const HIGH_VALUE_INVOICE_THRESHOLD_INR = 500_000;

const MIN_HIGH_VALUE_JUSTIFICATION_LENGTH = 10;

export type HighValueIssuanceCheck = {
  ok: boolean;
  error?: string;
  requiresJustification: boolean;
};

export function isHighValueInvoiceAmount(amount: number): boolean {
  return Number.isFinite(amount) && amount > HIGH_VALUE_INVOICE_THRESHOLD_INR;
}

export class BillingDirectionGuardService {
  /**
   * MSS→customer operational billing (invoices / sale bills) is invariant: always allowed for any project kind.
   * Payment routing and channel economics are modeled separately (collections / income), not via blocking invoices.
   */
  canUseDirection(project: Project | undefined, direction: BillingDirection): { ok: boolean; error?: string } {
    if (direction === "company_to_customer") {
      return { ok: true };
    }

    if (!project) {
      return { ok: true };
    }

    const allowedDirections = project.projectKindConfigSnapshot?.allowedBillingDirections;
    if (!allowedDirections || allowedDirections.length === 0) {
      return { ok: true };
    }

    if (allowedDirections.includes(direction)) {
      return { ok: true };
    }

    const label = project.projectMode
      ? `${project.projectMode}${project.partnerRole ? ` · ${project.partnerRole}` : ""}`
      : project.projectKind || "UNKNOWN";
    return {
      ok: false,
      error: `Billing direction '${direction}' is not allowed for project type ${label}`,
    };
  }

  /**
   * Invoices above {@link HIGH_VALUE_INVOICE_THRESHOLD_INR} require a typed justification before issuance.
   * Draft saves are exempt — callers pass `isDraft: true`.
   */
  validateHighValueIssuance(
    amount: number,
    justification?: string,
    options?: { isDraft?: boolean },
  ): HighValueIssuanceCheck {
    if (options?.isDraft || !isHighValueInvoiceAmount(amount)) {
      return { ok: true, requiresJustification: false };
    }
    const trimmed = justification?.trim() ?? "";
    if (trimmed.length < MIN_HIGH_VALUE_JUSTIFICATION_LENGTH) {
      return {
        ok: false,
        requiresJustification: true,
        error: `Invoices above ${formatINR(HIGH_VALUE_INVOICE_THRESHOLD_INR)} require a written justification (at least ${MIN_HIGH_VALUE_JUSTIFICATION_LENGTH} characters).`,
      };
    }
    return { ok: true, requiresJustification: true };
  }
}
