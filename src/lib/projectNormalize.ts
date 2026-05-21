import { projectKindConfigs, resolveProjectCapabilities } from "@/domain/projectTypes/config";
import { LEGACY_KIND_TO_TYPE, type ProjectKind } from "@/domain/projectTypes/types";
import { inferProjectKindFromTaxonomy } from "@/lib/projectTaxonomyDisplay";
import { withResolvedExecutionLineItems } from "@/domain/project/executionLineItems";
import { normalizeProjectPaymentType } from "@/domain/project/projectPaymentType";
import {
  canonicalizeProjectLifecycleStatus,
  legacyStatusFromLifecycle,
} from "@/domain/stateMachines/projectStateMachine";
import type { Project } from "@/types/project";
import { normalizeSiteReadinessMarkedBy } from "@/lib/siteReadinessNormalize";
import { ensureProjectPartnerEconomics } from "@/lib/projectPartnerEconomics";

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
  let kind: ProjectKind =
    p.projectKind && projectKindConfigs[p.projectKind]
      ? p.projectKind
      : inferProjectKindFromTaxonomy(p);
  if (!projectKindConfigs[kind]) {
    kind = "SOLO_EPC";
  }

  // Canonical lifecycle once at hydrate (O9); legacy status is derived for list badges.
  let lifecycleStatus = canonicalizeProjectLifecycleStatus(
    p.lifecycleStatus ??
      (p.status === "Completed" || p.status === "Closed"
        ? p.status
        : p.status === "On Hold"
          ? "On Hold"
          : p.status === "Ongoing"
            ? "In Progress"
            : undefined),
  );
  const isIntakeUnstarted =
    !p.startedAt &&
    (p.progressStage === "new" ||
      p.executionPhase === "Intake" ||
      p.executionPhase === "intake");
  if (isIntakeUnstarted) {
    lifecycleStatus = "New";
  }
  const status = legacyStatusFromLifecycle(lifecycleStatus);

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

  const withPartners = ensureProjectPartnerEconomics(baseProject);

  // Always recompute the snapshot from the resolver so visibleTabs / requiredDocuments /
  // forbiddenActions / allowedBillingDirections reflect the (possibly newer) attribute fields
  // rather than a stale snapshot captured at create time under the legacy registry.
  return withResolvedExecutionLineItems({
    ...withPartners,
    projectKindConfigSnapshot: computeCapabilitiesSnapshot(withPartners, kind),
  });
}
