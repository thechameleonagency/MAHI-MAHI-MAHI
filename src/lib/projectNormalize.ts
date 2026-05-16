import { projectKindConfigs } from "@/domain/projectTypes/config";
import type { ProjectKind } from "@/domain/projectTypes/types";
import type { Project } from "@/types/project";

/** Clone snapshot fields from `projectKindConfigs` for persistence (avoids drift vs. inline copies). */
export function projectKindConfigSnapshot(kind: ProjectKind) {
  const cfg = projectKindConfigs[kind] ?? projectKindConfigs.SOLO_EPC;
  return {
    requiredParties: [...cfg.requiredParties],
    requiredCommercialFields: [...cfg.requiredCommercialFields],
    allowedBillingDirections: [...cfg.allowedBillingDirections],
    visibleTabs: [...cfg.visibleTabs],
    requiredDocuments: [...cfg.requiredDocuments],
    forbiddenActions: [...cfg.forbiddenActions],
  };
}

function snapshotFromConfig(kind: ProjectKind) {
  return projectKindConfigSnapshot(kind);
}

/**
 * Ensures `projectKind` and `projectKindConfigSnapshot` are always coherent for UI (tabs, guards).
 * Legacy or partial records default to SOLO_EPC snapshot when kind is missing.
 */
export function normalizeProject(p: Project): Project {
  let kind: ProjectKind = p.projectKind ?? "SOLO_EPC";
  if (!projectKindConfigs[kind]) {
    kind = "SOLO_EPC";
  }
  
  // Enforce coherent synchronization between lifecycleStatus and legacy status/progressStage
  let lifecycleStatus = p.lifecycleStatus;
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
    lifecycleStatus = "Draft";
    status = "Ongoing";
  }

  const baseProject: Project = {
    ...p,
    projectKind: kind,
    lifecycleStatus,
    status,
    progressStage: p.progressStage ?? p.executionPhase,
    executionPhase: p.executionPhase ?? p.progressStage,
    address: p.address ?? p.clientAddress ?? p.location ?? "",
    clientAddress: p.clientAddress ?? p.address ?? p.location ?? "",
    state: p.state ?? "08",
  };

  const snap = p.projectKindConfigSnapshot;
  const snapOk =
    snap &&
    Array.isArray(snap.visibleTabs) &&
    snap.visibleTabs.length > 0 &&
    Array.isArray(snap.requiredDocuments);

  if (snapOk) {
    return baseProject;
  }

  const fresh = snapshotFromConfig(kind);
  if (!fresh) {
    return baseProject;
  }
  return {
    ...baseProject,
    projectKindConfigSnapshot: fresh,
  };
}
