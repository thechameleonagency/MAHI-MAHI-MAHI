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
  const snap = p.projectKindConfigSnapshot;
  const cfg = projectKindConfigs[kind];
  const snapOk =
    snap &&
    Array.isArray(snap.visibleTabs) &&
    snap.visibleTabs.length > 0 &&
    Array.isArray(snap.requiredDocuments);

  if (snapOk) {
    return { ...p, projectKind: kind };
  }

  const fresh = snapshotFromConfig(kind);
  if (!fresh) {
    return { ...p, projectKind: kind };
  }
  return {
    ...p,
    projectKind: kind,
    projectKindConfigSnapshot: fresh,
  };
}
