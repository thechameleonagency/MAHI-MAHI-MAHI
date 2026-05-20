import { projectKindConfigs, resolveProjectCapabilities } from "@/domain/projectTypes/config";
import { LEGACY_KIND_TO_TYPE, type ProjectKind } from "@/domain/projectTypes/types";
import { withResolvedExecutionLineItems } from "@/domain/project/executionLineItems";
import { normalizeProjectPaymentType } from "@/domain/project/projectPaymentType";
import type { Project } from "@/types/project";
import { normalizeSiteReadinessMarkedBy } from "@/lib/siteReadinessNormalize";

/**
 * Clone snapshot fields from `projectKindConfigs` for persistence (avoids drift vs. inline copies).
 * Used by callers that still build a snapshot from the legacy kind (e.g. seed factories that have
 * not yet been migrated to the new attribute fields). Prefer {@link computeCapabilitiesSnapshot}
 * for new code so the snapshot reflects the resolver-driven taxonomy.
 */
export function projectKindConfigSnapshot(kind: ProjectKind) {
  const cfg = projectKindConfigs[kind] ?? projectKindConfigs.SOLO_EPC;
  return {
    requiredParties: [...cfg.requiredParties],
    requiredCommercialFields: [...cfg.requiredCommercialFields],
    allowedBillingDirections: [...cfg.allowedBillingDirections],
    visibleTabs: [...cfg.visibleTabs],
    requiredDocuments: [...cfg.requiredDocuments],
    forbiddenActions: [...cfg.forbiddenActions],
    requiresClientInvoice: cfg.requiresClientInvoice,
  };
}

/**
 * Compute the project's capabilities snapshot from the new taxonomy (`projectMode`,
 * `vendorshipOwner`, `partnerRole`, `executionScope`, `outsource`). The snapshot shape is
 * unchanged — `requiredParties` / `requiredCommercialFields` still come from the legacy
 * kind-keyed config so commands and invariants keep working. Everything else (visibleTabs,
 * allowedBillingDirections, requiredDocuments, forbiddenActions) is computed by the resolver
 * so it reflects the actual project attributes, not the legacy kind name.
 */
function computeCapabilitiesSnapshot(p: Project, legacyKind: ProjectKind) {
  const legacy = projectKindConfigs[legacyKind] ?? projectKindConfigs.SOLO_EPC;
  const caps = resolveProjectCapabilities({
    projectMode: (p.projectMode ?? LEGACY_KIND_TO_TYPE[legacyKind].projectType),
    vendorshipOwner: (p.vendorshipOwner ?? LEGACY_KIND_TO_TYPE[legacyKind].vendorshipOwner),
    partnerRole: p.partnerRole ?? LEGACY_KIND_TO_TYPE[legacyKind].partnerRole,
    executionScope: (p.executionScope ?? LEGACY_KIND_TO_TYPE[legacyKind].executionScope),
    outsource: p.outsource ?? null,
  });
  return {
    requiredParties: [...legacy.requiredParties],
    requiredCommercialFields: [...legacy.requiredCommercialFields],
    allowedBillingDirections: [...caps.allowedBillingDirections],
    visibleTabs: [...caps.visibleTabs],
    requiredDocuments: [...caps.requiredDocuments],
    forbiddenActions: [...caps.forbiddenActions],
    requiresClientInvoice: legacy.requiresClientInvoice,
  };
}

/**
 * Ensures `projectKind` + new taxonomy fields + `projectKindConfigSnapshot` are always coherent.
 *  - Legacy records with only `projectKind` get the new attribute fields backfilled.
 *  - Records with the new fields already set get their snapshot recomputed from the resolver
 *    so visibleTabs / requiredDocuments / forbiddenActions track the actual project shape.
 */
export function normalizeProject(p: Project): Project {
  let kind: ProjectKind = p.projectKind ?? "SOLO_EPC";
  if (!projectKindConfigs[kind]) {
    kind = "SOLO_EPC";
  }

  // Enforce coherent synchronization between lifecycleStatus and legacy status/progressStage
  let lifecycleStatus = p.lifecycleStatus;
  // Unstarted intake rows → canonical "New" (C7); in-flight legacy Active rows stay until startedAt is set
  const isIntakeUnstarted =
    !p.startedAt &&
    (p.progressStage === "new" ||
      p.executionPhase === "Intake" ||
      lifecycleStatus === "Draft");
  if ((lifecycleStatus === "Active" || lifecycleStatus === "Draft") && isIntakeUnstarted) {
    lifecycleStatus = "New";
  }
  let status = p.status;
  if (lifecycleStatus && !status) {
    status = lifecycleStatus === "Completed" ? "Completed" : lifecycleStatus === "On Hold" ? "On Hold" : "Ongoing";
  } else if (status && !lifecycleStatus) {
    lifecycleStatus = status === "Completed" ? "Completed" : status === "On Hold" ? "On Hold" : status === "Ongoing" ? "Active" : "Draft";
  } else if (lifecycleStatus && status) {
    if (lifecycleStatus === "Completed" || status === "Completed") {
      lifecycleStatus = "Completed";
      status = "Completed";
    } else if (lifecycleStatus === "On Hold" || status === "On Hold") {
      lifecycleStatus = "On Hold";
      status = "On Hold";
    }
  } else if (!lifecycleStatus && !status) {
    lifecycleStatus = "New";
    status = "Ongoing";
  }

  // Migrate legacy projectKind → new attribute fields. If the new fields are already set,
  // prefer them; only backfill the absent ones.
  const legacyMap = LEGACY_KIND_TO_TYPE[kind];
  const projectMode = p.projectMode ?? legacyMap.projectType;
  const vendorshipOwner = p.vendorshipOwner ?? legacyMap.vendorshipOwner;
  const partnerRole = p.partnerRole ?? legacyMap.partnerRole;
  const executionScope = p.executionScope ?? legacyMap.executionScope;

  const baseProject: Project = {
    ...p,
    siteReadiness: p.siteReadiness
      ? {
          ...p.siteReadiness,
          markedBy: normalizeSiteReadinessMarkedBy(p.siteReadiness.markedBy),
        }
      : undefined,
    projectKind: kind,
    projectMode,
    vendorshipOwner,
    partnerRole,
    executionScope,
    outsource: p.outsource ?? null,
    lifecycleStatus,
    status,
    progressStage: p.progressStage ?? p.executionPhase,
    executionPhase: p.executionPhase ?? p.progressStage,
    address: p.address ?? p.clientAddress ?? p.location ?? "",
    clientAddress: p.clientAddress ?? p.address ?? p.location ?? "",
    state: p.state ?? "08",
    paymentType: normalizeProjectPaymentType(p.paymentType),
  };

  // Always recompute the snapshot from the resolver so visibleTabs / requiredDocuments /
  // forbiddenActions / allowedBillingDirections reflect the (possibly newer) attribute fields
  // rather than a stale snapshot captured at create time under the legacy registry.
  return withResolvedExecutionLineItems({
    ...baseProject,
    projectKindConfigSnapshot: computeCapabilitiesSnapshot(baseProject, kind),
  });
}
