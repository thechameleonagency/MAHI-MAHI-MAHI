import type { ProjectIntakePayload } from "@/application/services/ProjectTypeService";
import { LEGACY_KIND_TO_TYPE, type ProjectKind } from "@/domain/projectTypes/types";
import { formatCapacityKW } from "@/lib/formatCurrency";
import { projectKindConfigSnapshot } from "@/lib/projectNormalize";
import type { Project, Quotation } from "@/types/project";

export type BuildProjectShellResult =
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

/** Human-readable site label — never emits a lone `", "` when city/state are empty. */
export function formatProjectLocationFromQuotation(quotation: Quotation): string {
  const address = quotation.clientAddress?.trim();
  if (address) return address;
  const city = quotation.clientCity?.trim() ?? "";
  const state = quotation.clientState?.trim() ?? "";
  if (city && state) return `${city}, ${state}`;
  return city || state || "";
}

function projectTypeLabelFromQuotation(quotation: Quotation): Project["projectType"] {
  switch (quotation.systemCategory) {
    case "residential":
      return "Residential";
    case "commercial":
      return "Commercial";
    case "industrial":
      return "Industrial";
    default:
      return quotation.quotationType === "other" ? "Commercial" : "Residential";
  }
}

function ownerTypeFromKind(kind: ProjectKind): NonNullable<Project["ownerType"]> {
  if (kind === "PARTNER_EPC" || kind === "FIXED_EPC" || kind === "VENDOR_NETWORK") {
    return "partnership";
  }
  return "solo";
}

/**
 * Build a project shell from an approved quotation + validated intake when the caller
 * did not supply a full `project` payload (API/script path). Classification comes from
 * quotation `systemCategory` / `quotationType` and intake `kind`, not hard-coded defaults.
 */
export function buildProjectShellFromQuotation(params: {
  quotation: Quotation;
  intake: ProjectIntakePayload;
  projectName: string;
  projectId: string;
}): BuildProjectShellResult {
  const { quotation, intake, projectName, projectId } = params;
  const projectKind = resolveProjectKind(intake);

  if (quotation.quotationType === "solar" && !quotation.systemCategory) {
    return {
      ok: false,
      errorCode: "QUOTATION_MISSING_SYSTEM_CATEGORY",
      message:
        "Solar quotation is missing system category (residential / commercial / industrial). Pass a full project shell or complete the quotation before conversion.",
    };
  }

  const legacyMap = LEGACY_KIND_TO_TYPE[projectKind] ?? LEGACY_KIND_TO_TYPE.SOLO_EPC;
  const capacity = formatCapacityKW(quotation.systemCapacity);
  const location = formatProjectLocationFromQuotation(quotation);
  const contractAmount =
    Number(intake.commercial?.contractAmount) ||
    quotation.clientAgreedAmount ||
    quotation.totalAmount ||
    0;
  const paymentType =
    (intake.commercial?.paymentType as Project["paymentType"]) ||
    (quotation.paymentType as Project["paymentType"]) ||
    undefined;

  const today = new Date().toISOString().split("T")[0];

  const project: Project = {
    id: projectId,
    name: projectName,
    projectKind,
    projectKindConfigSnapshot: projectKindConfigSnapshot(projectKind),
    projectMode: legacyMap.projectType,
    vendorshipOwner: legacyMap.vendorshipOwner,
    partnerRole: legacyMap.partnerRole,
    executionScope: legacyMap.executionScope,
    outsource: null,
    type: projectKind === "INC_GIVEN" || projectKind === "INC" ? "INC" : "EPC",
    projectType: projectTypeLabelFromQuotation(quotation),
    projectCategory: quotation.quotationType === "other" ? "other" : "solar",
    ownerType: ownerTypeFromKind(projectKind),
    lifecycleStatus: "New",
    executionPhase: "Intake",
    progressStage: "new",
    client: quotation.clientName,
    customerId: quotation.customerId,
    clientAddress: quotation.clientAddress,
    clientPhone: quotation.clientPhone,
    clientEmail: quotation.clientEmail,
    capacity: capacity || "—",
    location,
    assignees: [],
    onSite: 0,
    contractAmount,
    totalCost: Number(intake.commercial?.internalCostEstimate) || 0,
    amountReceived: 0,
    quotationId: quotation.id,
    paymentType,
    bankDocumentationAmount: quotation.bankDocumentationAmount,
    agentId: quotation.agentId,
    photos: 0,
    startDate: today,
    endDate: null,
    createdAt: today,
  };

  return { ok: true, project };
}
