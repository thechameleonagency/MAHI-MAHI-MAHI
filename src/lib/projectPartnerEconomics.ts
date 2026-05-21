/**
 * E7 — Partner economics row on projects
 *
 * Calculations use `project.partners[0]`. Shell builders and CreateProjectSheet often
 * only set `scope.partnerId` / intake parties — this module materializes `partners[]`
 * and fixed-EPC commercial fields so derivePartnerEconomics works after fallback create.
 */
import type { LegacyIntakePayload, ProjectIntakePayload } from "@/application/services/ProjectTypeService";
import { calculateProjectPartnerEarning } from "@/domain/partners/derivePartnerEconomics";
import type { Partner } from "@/types/finance";
import type { Project, ProjectKind, ProjectPartner, ProjectPartnerType, ProjectScopeConfig } from "@/types/project";

const PARTNERSHIP_KINDS: ProjectKind[] = [
  "PARTNER_EPC",
  "FIXED_EPC",
  "VENDOR_NETWORK",
  "VENDORSHIP_ONLY",
];

export function projectKindRequiresPartnerRow(kind: ProjectKind | undefined): boolean {
  return kind != null && PARTNERSHIP_KINDS.includes(kind);
}

export function partnerTypeForProjectKind(kind: ProjectKind): ProjectPartnerType | null {
  switch (kind) {
    case "PARTNER_EPC":
      return "profit";
    case "FIXED_EPC":
      return "fixed";
    case "VENDOR_NETWORK":
    case "VENDORSHIP_ONLY":
      return "vendorship";
    default:
      return null;
  }
}

function intakeParties(intake?: ProjectIntakePayload): LegacyIntakePayload["parties"] | undefined {
  if (!intake || typeof intake !== "object") return undefined;
  return "parties" in intake ? intake.parties : undefined;
}

function intakeCommercial(intake?: ProjectIntakePayload): LegacyIntakePayload["commercial"] | undefined {
  if (!intake || typeof intake !== "object") return undefined;
  return "commercial" in intake ? intake.commercial : undefined;
}

export function parseCapacityKw(capacity: string | undefined): number {
  if (!capacity) return 0;
  const m = capacity.match(/([\d.]+)/);
  return m ? Number.parseFloat(m[1]) : 0;
}

function findPartnerMaster(
  catalog: Pick<Partner, "id" | "name" | "type">[] | undefined,
  scope: ProjectScopeConfig | undefined,
  intake?: ProjectIntakePayload,
): Pick<Partner, "id" | "name" | "type"> | undefined {
  if (!catalog?.length) return undefined;
  if (scope?.partnerId) {
    return catalog.find((p) => p.id === scope.partnerId);
  }
  const parties = intakeParties(intake);
  const name =
    parties?.partner?.trim() ||
    parties?.channelPartner?.trim() ||
    parties?.externalNetwork?.trim();
  if (!name) return undefined;
  const lower = name.toLowerCase();
  return catalog.find((p) => p.name.trim().toLowerCase() === lower);
}

function settlementDirectionForType(type: ProjectPartnerType): ProjectPartner["settlementDirection"] {
  if (type === "vendorship") return "partner_pays_company";
  return "company_pays_partner";
}

/** Build a single partner economics row from scope + intake + master catalog. */
export function buildProjectPartnerRow(params: {
  projectKind: ProjectKind;
  scope?: ProjectScopeConfig;
  intake?: ProjectIntakePayload;
  partnerMaster?: Pick<Partner, "id" | "name" | "type">;
  contractAmount?: number;
  capacityKw?: number;
}): ProjectPartner | undefined {
  const partnerType = partnerTypeForProjectKind(params.projectKind);
  if (!partnerType) return undefined;

  const scope = params.scope;
  const commercial = intakeCommercial(params.intake);
  const master = params.partnerMaster;
  const partnerId =
    scope?.partnerId ||
    master?.id ||
    (() => {
      const name =
        intakeParties(params.intake)?.partner ||
        intakeParties(params.intake)?.channelPartner ||
        intakeParties(params.intake)?.externalNetwork;
      return name ? `partner-${name.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 40)}` : undefined;
    })();

  if (!partnerId) return undefined;

  const partnerName =
    master?.name ||
    intakeParties(params.intake)?.partner ||
    intakeParties(params.intake)?.channelPartner ||
    intakeParties(params.intake)?.externalNetwork ||
    "Partner";

  const contractAmount = params.contractAmount ?? 0;
  const capacityKw = params.capacityKw ?? 0;

  const row: ProjectPartner = {
    partnerId,
    partnerName,
    partnerType,
    settlementDirection: settlementDirectionForType(partnerType),
  };

  if (partnerType === "profit") {
    const pct =
      scope?.profitSharePercent ??
      (typeof commercial?.commissionRule === "number" ? commercial.commissionRule : undefined);
    const share = pct != null && Number.isFinite(Number(pct)) ? Number(pct) : 30;
    row.sharePercentage = share;
    row.profitSharePercent = share;
  }

  if (partnerType === "fixed") {
    const backend =
      Number(commercial?.backendPrice) ||
      (scope?.fixedRatePerKw != null && capacityKw > 0 ? scope.fixedRatePerKw * capacityKw : undefined);
    const sell =
      Number(commercial?.partnerSellPrice) ||
      contractAmount ||
      undefined;
    if (backend != null && sell != null) {
      row.fixedAmount = Math.max(0, Math.round((sell - backend) * 100) / 100);
    }
  }

  if (partnerType === "vendorship") {
    row.feeAmount =
      scope?.vendorshipFeeAmount ??
      (Number(commercial?.vendorshipFeeReceivable) || 0);
  }

  return row;
}

/** Runtime row for UI: persisted partners[0] or ephemeral row from scope/intake. */
export function resolveProjectPartnerRow(project: Project): ProjectPartner | undefined {
  if (project.partners?.[0]) return project.partners[0];
  if (!projectKindRequiresPartnerRow(project.projectKind)) return undefined;
  return buildProjectPartnerRow({
    projectKind: project.projectKind!,
    scope: project.scope,
    contractAmount: project.contractAmount,
    capacityKw: parseCapacityKw(project.capacity),
  });
}

/**
 * Ensure `partners[]` and fixed-EPC commercial fields exist for partnership projects.
 * Safe to call on create, normalize, and command handlers.
 */
export function ensureProjectPartnerEconomics(
  project: Project,
  options?: {
    intake?: ProjectIntakePayload;
    partnerCatalog?: Pick<Partner, "id" | "name" | "type">[];
  },
): Project {
  if (!projectKindRequiresPartnerRow(project.projectKind)) {
    return project;
  }

  const capacityKw = parseCapacityKw(project.capacity);
  const commercial = intakeCommercial(options?.intake);
  const master = findPartnerMaster(options?.partnerCatalog, project.scope, options?.intake);

  let next: Project = { ...project };

  if (project.projectKind === "FIXED_EPC") {
    const backend =
      next.mssBackendAmount ??
      Number(commercial?.backendPrice) ??
      (next.scope?.fixedRatePerKw != null && capacityKw > 0
        ? next.scope.fixedRatePerKw * capacityKw
        : undefined);
    const sell =
      next.partnerCustomerSellAmount ??
      Number(commercial?.partnerSellPrice) ??
      next.contractAmount;
    if (backend != null) next = { ...next, mssBackendAmount: backend };
    if (sell != null) next = { ...next, partnerCustomerSellAmount: sell };
  }

  if (next.partners?.length) {
    let row = next.partners[0];
    if (master && row.partnerId !== master.id) {
      row = { ...row, partnerId: master.id, partnerName: master.name };
    }
    const earning = calculateProjectPartnerEarning(next, row);
    const patch: ProjectPartner = {
      ...row,
      ...(row.calculatedEarning == null && earning > 0 ? { calculatedEarning: earning } : {}),
    };
    if (patch.partnerId !== next.partners[0].partnerId || patch.calculatedEarning !== next.partners[0].calculatedEarning) {
      return { ...next, partners: [patch, ...next.partners.slice(1)] };
    }
    return next;
  }

  const built = buildProjectPartnerRow({
    projectKind: next.projectKind!,
    scope: next.scope,
    intake: options?.intake,
    partnerMaster: master,
    contractAmount: next.contractAmount,
    capacityKw,
  });
  if (!built) return next;

  const earning = calculateProjectPartnerEarning(next, built);
  return {
    ...next,
    partners: [{ ...built, calculatedEarning: earning > 0 ? earning : undefined }],
  };
}
