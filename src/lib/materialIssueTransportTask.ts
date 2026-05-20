import type { SiteRecord } from "@/types/project";

export type TransportWorkKind = { workType: string; stageKey: string };

/** Resolve site row for transport task — prefer projectId linkage over display name. */
export function resolveSiteForMaterialIssue(
  sites: Pick<SiteRecord, "id" | "name" | "projectId">[],
  projectId: string | undefined,
  projectName: string,
): { siteId: string; siteName: string } {
  if (projectId) {
    const byProject = sites.find((s) => s.projectId === projectId);
    if (byProject) {
      return { siteId: byProject.id, siteName: byProject.name };
    }
  }
  const byName = sites.find((s) => s.name === projectName);
  if (byName) {
    return { siteId: byName.id, siteName: byName.name };
  }
  return { siteId: "unlinked", siteName: projectName };
}

/** Classify transport milestone from issued material names. */
export function inferTransportWorkKind(materialNames: string[]): TransportWorkKind {
  const names = materialNames.map((n) => n.toLowerCase());
  if (names.some((n) => n.includes("panel") || n.includes("module"))) {
    return { workType: "Panel Transport", stageKey: "panel-transport" };
  }
  if (names.some((n) => n.includes("inverter"))) {
    return { workType: "Inverter Transport", stageKey: "inverter-transport" };
  }
  if (names.some((n) => n.includes("structure") || n.includes("leg") || n.includes("raftor"))) {
    return { workType: "Structure Transport", stageKey: "structure-transport" };
  }
  return { workType: "Material Transport", stageKey: "structure-transport" };
}
