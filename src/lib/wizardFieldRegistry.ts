import type { ProjectKind } from "@/domain/projectTypes/types";
import { deriveProjectKind, isVendorshipStepApplicable } from "@/lib/createProjectWizardLogic";
import type { CreateProjectWizardState } from "@/types/createProjectWizard";

export type WizardReviewSection = "vendorship" | "agent" | "team";

const REVIEW_SECTIONS_BY_KIND: Record<ProjectKind, WizardReviewSection[]> = {
  SOLO_EPC: ["vendorship", "agent", "team"],
  PARTNER_EPC: ["vendorship", "agent", "team"],
  FIXED_EPC: ["vendorship", "agent", "team"],
  VENDOR_NETWORK: ["vendorship", "agent", "team"],
  VENDORSHIP_ONLY: ["vendorship", "agent", "team"],
  INC: ["agent", "team"],
  INC_GIVEN: ["agent", "team"],
  OUTSOURCED_INC: ["agent", "team"],
};

export function getWizardReviewSections(state: CreateProjectWizardState): WizardReviewSection[] {
  const kind = deriveProjectKind(state);
  const sections = REVIEW_SECTIONS_BY_KIND[kind] ?? ["agent", "team"];
  return sections.filter((section) => {
    if (section === "vendorship") return isVendorshipStepApplicable(state);
    return true;
  });
}
