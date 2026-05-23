import type { UnifiedProjectWizardState, UnifiedWizardStep } from "@/types/createProjectWizard";
import {
  Step1Schema,
  Step2Schema,
  Step3Schema,
  Step4Schema,
  Step5Schema,
  Step6Schema,
} from "@/types/createProjectWizard";

export const UNIFIED_WIZARD_STEP_LABELS: Record<UnifiedWizardStep, string> = {
  deal: "Deal structure",
  vendorship: "Vendorship code",
  source: "Pipeline source",
  details: "Customer & system",
  parties: "Counterparties",
  commercials: "Commercials",
  review: "Review",
};

export function skipVendorshipStep(state: UnifiedProjectWizardState): boolean {
  return state.dealOrigin === "INC_TAKEN" && state.incModifier === "LABOR_ONLY";
}

export function getVisibleUnifiedWizardSteps(state: UnifiedProjectWizardState): UnifiedWizardStep[] {
  const steps: UnifiedWizardStep[] = ["deal"];
  if (!skipVendorshipStep(state)) steps.push("vendorship");
  if (state.dealOrigin === "DIRECT") steps.push("source");
  steps.push("details");
  if (state.dealOrigin === "PARTNER" || state.dealOrigin === "INC_TAKEN") steps.push("parties");
  steps.push("commercials", "review");
  return steps;
}

export function validateUnifiedWizardStep(
  step: UnifiedWizardStep,
  state: UnifiedProjectWizardState,
): { field: string; message: string }[] {
  try {
    if (step === "deal") Step1Schema.parse(state);
    if (step === "vendorship" && !skipVendorshipStep(state)) Step2Schema.parse(state);
    if (step === "source" && state.dealOrigin === "DIRECT") Step3Schema.parse(state);
    if (step === "details") Step4Schema.parse(state);
    if (step === "parties") Step5Schema.parse(state);
    if (step === "commercials") Step6Schema.parse(state);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      const zodError = error as { issues: { path: (string | number)[]; message: string }[] };
      return zodError.issues.map((issue) => ({
        field: issue.path.join(".") || step,
        message: issue.message,
      }));
    }
  }
  return [];
}
