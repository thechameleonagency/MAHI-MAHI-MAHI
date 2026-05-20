import type { ProjectIntakePayload } from "@/application/services/ProjectTypeService";
import { LEGACY_KIND_TO_TYPE, type ProjectKind } from "@/domain/projectTypes/types";
import {
  validateDirectExceptionSite,
  type DirectExceptionSiteDetails,
  type DirectExceptionSiteValidation,
} from "@/domain/project/directExceptionSite";
import { formatCapacityKW } from "@/lib/formatCurrency";
import { projectKindConfigSnapshot } from "@/lib/projectNormalize";
import type { Project } from "@/types/project";

export type BuildDirectExceptionProjectResult =
  | { ok: true; project: Project }
  | { ok: false; errorCode: string; message: string };

function isLegacyIntake(
  intake: ProjectIntakePayload,
): intake is Extract<ProjectIntakePayload, { kind: ProjectKind }> {
  return "kind" in intake && Boolean((intake as { kind?: ProjectKind }).kind);
}

function resolveProjectKind(intake: ProjectIntakePayload): ProjectKind {
  if (isLegacyIntake(intake)) {
    return intake.kind;
  }
  const typed = intake as Extract<ProjectIntakePayload, { projectMode: string }>;
  const match = (
    Object.entries(LEGACY_KIND_TO_TYPE) as [ProjectKind, (typeof LEGACY_KIND_TO_TYPE)[ProjectKind]][]
  ).find(
    ([, v]) =>
      v.projectType === typed.projectMode &&
      v.vendorshipOwner === typed.vendorshipOwner &&
      v.partnerRole === typed.partnerRole &&
      v.executionScope === typed.executionScope,
  );
  return match?.[0] ?? "SOLO_EPC";
}

function ownerTypeFromKind(kind: ProjectKind): NonNullable<Project["ownerType"]> {
  if (kind === "PARTNER_EPC" || kind === "FIXED_EPC" || kind === "VENDOR_NETWORK") {
    return "partnership";
  }
  return "solo";
}

function resolveSiteFromIntake(intake: ProjectIntakePayload): DirectExceptionSiteDetails | undefined {
  return (intake as { site?: DirectExceptionSiteDetails }).site;
}

function resolvePaymentType(intake: ProjectIntakePayload): Project["paymentType"] | undefined {
  const raw = intake.commercial?.paymentType;
  if (raw === "cash" || raw === "loan" || raw === "cash-and-loan") return raw;
  return undefined;
}

/**
 * Build a direct-exception project from validated intake + explicit site details.
 * Fails closed when classification fields are missing — no Commercial / Pending defaults.
 */
export function buildProjectShellFromDirectException(params: {
  intake: ProjectIntakePayload;
  projectName: string;
  projectId: string;
  reason: string;
  customerId?: string;
}): BuildDirectExceptionProjectResult {
  const siteValidation: DirectExceptionSiteValidation = validateDirectExceptionSite(
    resolveSiteFromIntake(params.intake),
  );
  if (!siteValidation.ok) {
    return { ok: false, errorCode: siteValidation.errorCode, message: siteValidation.message };
  }
  const site = siteValidation.site;

  const projectKind = resolveProjectKind(params.intake);
  const paymentType = resolvePaymentType(params.intake);
  const paymentOptional =
    projectKind === "VENDORSHIP_ONLY" || projectKind === "VENDOR_NETWORK";
  if (!paymentType && !paymentOptional) {
    return {
      ok: false,
      errorCode: "DIRECT_EXCEPTION_PAYMENT_TYPE_REQUIRED",
      message: "Payment type (cash, loan, or cash-and-loan) is required for this project kind.",
    };
  }
  const legacyMap = LEGACY_KIND_TO_TYPE[projectKind] ?? LEGACY_KIND_TO_TYPE.SOLO_EPC;
  const clientName =
    params.intake.parties?.customer ||
    params.intake.parties?.channelPartner ||
    params.intake.parties?.externalNetwork ||
    "Unknown";
  const capacity = formatCapacityKW(site.capacity) || site.capacity.trim();
  const contractAmt = Number(params.intake.commercial?.contractAmount || 0);
  const today = new Date().toISOString().split("T")[0];

  const project: Project = {
    id: params.projectId,
    name: params.projectName,
    projectKind,
    projectKindConfigSnapshot: projectKindConfigSnapshot(projectKind),
    projectMode: legacyMap.projectType,
    vendorshipOwner: legacyMap.vendorshipOwner,
    partnerRole: legacyMap.partnerRole,
    executionScope: legacyMap.executionScope,
    outsource: null,
    type: projectKind === "INC_GIVEN" || projectKind === "INC" ? "INC" : "EPC",
    projectType: site.projectType,
    projectCategory: site.projectCategory,
    ownerType: ownerTypeFromKind(projectKind),
    lifecycleStatus: "New",
    executionPhase: "Intake",
    progressStage: "exception_review",
    client: clientName,
    customerId: params.customerId?.trim() || undefined,
    clientAddress: site.location,
    address: site.location,
    capacity,
    location: site.location,
    assignees: [],
    onSite: 0,
    contractAmount: contractAmt,
    totalCost: Number(params.intake.commercial?.internalCostEstimate) || 0,
    amountReceived: 0,
    photos: 0,
    startDate: today,
    endDate: null,
    createdAt: today,
    directCreationReason: params.reason,
    paymentType: paymentType || undefined,
  };

  return { ok: true, project };
}
