import { projectKindConfigs, resolveProjectCapabilities } from "@/domain/projectTypes/config";
import {
  LEGACY_KIND_TO_TYPE,
  type BillingDirection,
  type ExecutionScope,
  type PartnerRole,
  type ProjectCapabilities,
  type ProjectKind,
  type ProjectType,
  type VendorshipOwner,
} from "@/domain/projectTypes/types";

/**
 * Canonical intake payload — describes a project before it has been persisted, in a form the
 * service can validate. Two shapes are accepted:
 *
 * 1. The legacy `{ kind, parties, commercial }` payload — `kind` is the 8-value `ProjectKind`.
 *    Used by `registerProjectCommands` and the old quotation conversion path. Internally the
 *    service derives the new taxonomy via {@link LEGACY_KIND_TO_TYPE}.
 *
 * 2. The new `{ projectMode, vendorshipOwner, partnerRole?, executionScope, parties, commercial }`
 *    payload — emitted by the new Create Project sheet path.
 *
 * Either shape produces the same capability resolution, so consumers can migrate at their own pace.
 */
import type { DirectExceptionSiteDetails } from "@/domain/project/directExceptionSite";
import { resolveIntakeLegacyKind } from "@/domain/project/intakePayload";
import { isProjectPaymentType } from "@/domain/project/projectPaymentType";

export type ProjectIntakePayload =
  | LegacyIntakePayload
  | TypedIntakePayload;

export interface LegacyIntakePayload {
  kind: ProjectKind;
  /** Required for `CREATE_DIRECT_PROJECT_EXCEPTION` — explicit site/classification (no quotation). */
  site?: DirectExceptionSiteDetails;
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
  commercial: Partial<
    Record<
      "contractAmount" | "paymentType" | "internalCostEstimate" | "backendPrice" | "partnerSellPrice" | "commissionRule" | "vendorshipFeeReceivable",
      string | number
    >
  >;
}

export interface TypedIntakePayload {
  projectMode: ProjectType;
  vendorshipOwner: VendorshipOwner;
  partnerRole?: PartnerRole;
  executionScope: ExecutionScope;
  site?: DirectExceptionSiteDetails;
  parties: LegacyIntakePayload["parties"];
  commercial: LegacyIntakePayload["commercial"];
  outsource?: unknown | null;
}

/**
 * Validates project intake against the resolved capability shape — required parties + required
 * commercial fields. Capability gates (visibleTabs, allowedBillingDirections, …) come from
 * {@link resolveProjectCapabilities} when callers need them.
 */
export class ProjectTypeService {
  /**
   * @deprecated Back-compat shim for callers that used `new ProjectKindService().getConfig(kind)`.
   * Returns the legacy registry entry. New code should use {@link getCapabilities}.
   */
  getConfig(kind: ProjectKind) {
    return projectKindConfigs[kind];
  }

  /** Resolve capabilities for a project (or in-flight intake). */
  getCapabilities(input: TypedIntakePayload | ProjectKind): ProjectCapabilities {
    if (typeof input === "string") {
      // Legacy kind path — translate through the static mapping.
      const map = LEGACY_KIND_TO_TYPE[input];
      return resolveProjectCapabilities({
        projectMode: map.projectType,
        vendorshipOwner: map.vendorshipOwner,
        partnerRole: map.partnerRole,
        executionScope: map.executionScope,
        outsource: null,
      });
    }
    return resolveProjectCapabilities({
      projectMode: input.projectMode,
      vendorshipOwner: input.vendorshipOwner,
      partnerRole: input.partnerRole,
      executionScope: input.executionScope,
      outsource: input.outsource ?? null,
    });
  }

  /**
   * Required parties + commercial fields come from the legacy `projectKindConfigs` registry —
   * that data isn't currently expressible through the resolver because it's intake-shape
   * specific. For new-style payloads we look up the closest legacy kind.
   */
  validateIntake(payload: ProjectIntakePayload): { ok: boolean; errors: string[] } {
    const errors: string[] = [];

    const kindResolve = resolveIntakeLegacyKind(payload);
    if (!kindResolve.ok) {
      return { ok: false, errors: [kindResolve.error] };
    }
    const legacyKind = kindResolve.kind;

    const config = projectKindConfigs[legacyKind];
    if (!config) {
      return { ok: false, errors: [`Unknown project kind: ${String(legacyKind)}`] };
    }

    config.requiredParties.forEach((partyKey) => {
      const value = payload.parties[partyKey];
      if (!value) errors.push(`Missing required party: ${partyKey}`);
    });

    config.requiredCommercialFields.forEach((fieldKey) => {
      const value = payload.commercial[fieldKey];
      if (fieldKey === "paymentType") {
        if (!isProjectPaymentType(value)) {
          if (value === undefined || value === null || value === "") {
            errors.push("Missing required commercial field: paymentType");
          } else {
            errors.push(
              `Invalid payment type "${String(value)}". Must be cash, loan, or cash-and-loan.`,
            );
          }
        }
        return;
      }
      if (value === undefined || value === null || value === "") {
        errors.push(`Missing required commercial field: ${fieldKey}`);
      }
    });

    return { ok: errors.length === 0, errors };
  }

  validateBillingDirection(
    input: ProjectKind | TypedIntakePayload,
    direction: BillingDirection,
  ): boolean {
    if (direction === "company_to_customer") return true;
    const caps = this.getCapabilities(input);
    return caps.allowedBillingDirections.includes(direction);
  }
}
