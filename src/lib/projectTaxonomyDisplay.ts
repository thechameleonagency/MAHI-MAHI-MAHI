import { projectKindConfigs } from "@/domain/projectTypes/config";
import {
  LEGACY_KIND_TO_TYPE,
  PROJECT_KINDS,
  PROJECT_TYPES,
  projectTypeLabels,
  type ProjectKind,
  type ProjectType,
} from "@/domain/projectTypes/types";
import type { Project } from "@/types/project";

/** Compact list/detail badge labels (legacy UI copy). */
export const PROJECT_KIND_UI_LABELS: Record<ProjectKind, string> = {
  SOLO_EPC: "Solo",
  PARTNER_EPC: "Partner",
  FIXED_EPC: "Fixed",
  VENDOR_NETWORK: "Vendor",
  INC: "INC",
  INC_GIVEN: "INC Given",
  OUTSOURCED_INC: "Outsourced",
  VENDORSHIP_ONLY: "Vendorship Only",
};

export const PROJECT_KIND_UI_TONES: Record<ProjectKind, string> = {
  SOLO_EPC: "bg-success/10 text-success border-success/25",
  PARTNER_EPC: "bg-primary/10 text-primary border-primary/25",
  FIXED_EPC: "bg-warning/10 text-warning border-warning/25",
  VENDOR_NETWORK: "bg-accent/10 text-accent-foreground border-accent/25",
  INC: "bg-slate-500/10 text-slate-700 border-slate-500/25",
  INC_GIVEN: "bg-warning/10 text-warning border-warning/25",
  OUTSOURCED_INC: "bg-primary/10 text-primary border-primary/25",
  VENDORSHIP_ONLY: "bg-accent/10 text-accent-foreground border-accent/25",
};

export const PROJECT_MODE_UI_TONES: Record<ProjectType, string> = {
  DIRECT_CLIENT: "bg-success/10 text-success border-success/25",
  PARTNER_NETWORK: "bg-primary/10 text-primary border-primary/25",
  INC_GIVEN_TO_US: "bg-warning/10 text-warning border-warning/25",
};

/** Infer legacy kind when persisted rows only have the 3-value taxonomy (+ attributes). */
export function inferProjectKindFromTaxonomy(
  p: Pick<Project, "projectMode" | "vendorshipOwner" | "partnerRole" | "executionScope" | "outsource">,
): ProjectKind {
  const mode = p.projectMode;
  if (mode === "INC_GIVEN_TO_US") return "INC_GIVEN";
  if (mode === "PARTNER_NETWORK") {
    if (p.partnerRole === "fixed_margin") return "FIXED_EPC";
    if (p.partnerRole === "vendor_channel") return "VENDOR_NETWORK";
    if (p.partnerRole === "vendorship_only") return "VENDORSHIP_ONLY";
    return "PARTNER_EPC";
  }
  if (p.executionScope === "service_only") return "INC";
  if (p.outsource) return "OUTSOURCED_INC";
  return "SOLO_EPC";
}

/** Canonical 8-value kind for UI filters, badges, and legacy invariants. */
export function canonicalProjectKind(project: Project): ProjectKind {
  if (project.projectKind && projectKindConfigs[project.projectKind]) {
    return project.projectKind;
  }
  return inferProjectKindFromTaxonomy(project);
}

/** Derived 3-value mode — always coherent with {@link canonicalProjectKind}. */
export function canonicalProjectMode(project: Project): ProjectType {
  if (project.projectMode && (PROJECT_TYPES as readonly string[]).includes(project.projectMode)) {
    const kind = canonicalProjectKind(project);
    const expected = LEGACY_KIND_TO_TYPE[kind].projectType;
    if (project.projectMode === expected) return project.projectMode;
  }
  return LEGACY_KIND_TO_TYPE[canonicalProjectKind(project)].projectType;
}

export function projectKindUiLabel(kind: ProjectKind): string {
  return PROJECT_KIND_UI_LABELS[kind] ?? projectKindConfigs[kind]?.label ?? kind;
}

export function projectKindRegistryLabel(kind: ProjectKind): string {
  return projectKindConfigs[kind]?.label ?? kind;
}

export function projectModeUiLabel(mode: ProjectType): string {
  return projectTypeLabels[mode] ?? mode;
}

export function projectMatchesKindFilter(project: Project, filter: string): boolean {
  if (filter === "all") return true;
  return canonicalProjectKind(project) === filter;
}

/** Filter dropdown options: legacy kinds (aligns list badges with filter). */
export const PROJECT_KIND_FILTER_OPTIONS = PROJECT_KINDS.map((kind) => ({
  value: kind,
  label: projectKindRegistryLabel(kind),
}));
