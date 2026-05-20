import type { Project } from "@/types/project";

type ReadinessResult = {
  ok: boolean;
  errors: string[];
};

export class ProjectReadinessService {
  validateForCompletion(project: Project): ReadinessResult {
    const errors: string[] = [];
    const requiredDocuments = project.projectKindConfigSnapshot?.requiredDocuments || [];
    const hasDocumentEvidence = Boolean(project.documents?.length);
    const visibleTabs = project.projectKindConfigSnapshot?.visibleTabs ?? [];
    const hasBillingTab = !project.projectKindConfigSnapshot || visibleTabs.includes("billing");

    if (requiredDocuments.length > 0 && !hasDocumentEvidence) {
      errors.push("Required project documents are not uploaded");
    }

    if (hasBillingTab && (!project.contractAmount || project.contractAmount <= 0)) {
      errors.push("Project contract amount must be greater than zero");
    }

    if (hasBillingTab && (project.amountReceived || 0) < 0) {
      errors.push("Project amount received cannot be negative");
    }

    if (!project.progressStage) {
      errors.push("Project progress stage is required");
    }

    return {
      ok: errors.length === 0,
      errors,
    };
  }
}

