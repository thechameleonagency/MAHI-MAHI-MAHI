import { projectKindConfigs } from "@/domain/projectTypes/config";
import type { BillingDirection, ProjectKind } from "@/domain/projectTypes/types";
import type { ProjectKindConfig } from "@/domain/projectTypes/types";

export type ProjectIntakePayload = {
  kind: ProjectKind;
  parties: Partial<
    Record<
      | "customer"
      | "partner"
      | "channelPartner"
      | "vendorOrDiscom"
      | "externalNetwork"
      | "incGiverCompany"
      | "subcontractor",
      string
    >
  >;
  commercial: Partial<Record<"contractAmount" | "paymentType" | "internalCostEstimate" | "backendPrice" | "partnerSellPrice" | "commissionRule" | "vendorshipFeeReceivable", string | number>>;
};

export class ProjectKindService {
  /** Returns undefined for unknown kinds — callers must guard. */
  getConfig(kind: ProjectKind): ProjectKindConfig | undefined {
    return projectKindConfigs[kind];
  }

  validateIntake(payload: ProjectIntakePayload): { ok: boolean; errors: string[] } {
    const config = this.getConfig(payload.kind);
    const errors: string[] = [];

    if (!config) {
      return {
        ok: false,
        errors: [`Unknown project kind: ${String(payload.kind)}`],
      };
    }

    config.requiredParties.forEach((partyKey) => {
      const value = payload.parties[partyKey];
      if (!value) {
        errors.push(`Missing required party: ${partyKey}`);
      }
    });

    config.requiredCommercialFields.forEach((fieldKey) => {
      const value = payload.commercial[fieldKey];
      if (value === undefined || value === null || value === "") {
        errors.push(`Missing required commercial field: ${fieldKey}`);
      }
    });

    return {
      ok: errors.length === 0,
      errors,
    };
  }

  validateBillingDirection(kind: ProjectKind, direction: BillingDirection): boolean {
    /** MSS→customer operational billing matches BillingDirectionGuardService — invariant. */
    if (direction === "company_to_customer") {
      return true;
    }
    const config = this.getConfig(kind);
    if (!config) {
      return false;
    }
    return config.allowedBillingDirections.includes(direction);
  }
}
