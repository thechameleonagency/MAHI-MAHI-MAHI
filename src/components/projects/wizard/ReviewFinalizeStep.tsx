import { AgentStep, type AgentStepCatalog } from "@/components/projects/wizard/AgentStep";
import { TeamStep, type TeamStepCatalog } from "@/components/projects/wizard/TeamStep";
import { VendorshipStep, type VendorshipStepCatalog } from "@/components/projects/wizard/VendorshipStep";
import type { CreateProjectWizardState } from "@/types/createProjectWizard";

export interface ReviewFinalizeStepCatalog
  extends VendorshipStepCatalog,
    AgentStepCatalog,
    TeamStepCatalog {}

export interface ReviewFinalizeStepProps {
  state: CreateProjectWizardState;
  onChange: (patch: Partial<CreateProjectWizardState>) => void;
  catalog?: ReviewFinalizeStepCatalog;
}

export function ReviewFinalizeStep({ state, onChange, catalog }: ReviewFinalizeStepProps) {
  return (
    <div className="space-y-8" data-testid="wizard-review-finalize-step">
      <VendorshipStep state={state} onChange={onChange} catalog={catalog} />
      <AgentStep state={state} onChange={onChange} catalog={catalog} />
      <TeamStep state={state} onChange={onChange} catalog={catalog} />
    </div>
  );
}

export default ReviewFinalizeStep;
