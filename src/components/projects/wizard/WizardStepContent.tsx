import { AgentStep, type AgentStepCatalog } from "@/components/projects/wizard/AgentStep";
import { AttachPartiesStep, type AttachPartiesStepCatalog } from "@/components/projects/wizard/AttachPartiesStep";
import { CommercialStep, type CommercialStepCatalog } from "@/components/projects/wizard/CommercialStep";
import { CustomerStep, type CustomerStepCatalog } from "@/components/projects/wizard/CustomerStep";
import { ExceptionStep, type ExceptionStepCatalog } from "@/components/projects/wizard/ExceptionStep";
import { LeadPathStep, type LeadPathStepCatalog } from "@/components/projects/wizard/LeadPathStep";
import { QuotationStep, type QuotationStepCatalog } from "@/components/projects/wizard/QuotationStep";
import { ReviewFinalizeStep, type ReviewFinalizeStepCatalog } from "@/components/projects/wizard/ReviewFinalizeStep";
import { SourceStep, type SourceStepCatalog } from "@/components/projects/wizard/SourceStep";
import { TeamStep, type TeamStepCatalog } from "@/components/projects/wizard/TeamStep";
import { VendorshipStep, type VendorshipStepCatalog } from "@/components/projects/wizard/VendorshipStep";
import type { CreateProjectWizardState, WizardStep } from "@/types/createProjectWizard";

export interface WizardStepContentCatalog
  extends SourceStepCatalog,
    LeadPathStepCatalog,
    CustomerStepCatalog,
    CommercialStepCatalog,
    VendorshipStepCatalog,
    AgentStepCatalog,
    TeamStepCatalog,
    QuotationStepCatalog,
    ExceptionStepCatalog,
    AttachPartiesStepCatalog,
    ReviewFinalizeStepCatalog {}

export interface WizardStepContentProps {
  step: WizardStep;
  state: CreateProjectWizardState;
  updateState: (patch: Partial<CreateProjectWizardState>) => void;
  catalog?: WizardStepContentCatalog;
}

export function WizardStepContent({ step, state, updateState, catalog }: WizardStepContentProps) {
  switch (step) {
    case "SOURCE":
      return <SourceStep state={state} onChange={updateState} catalog={catalog} />;
    case "QUOTATION":
      return <QuotationStep state={state} onChange={updateState} catalog={catalog} />;
    case "EXCEPTION":
      return <ExceptionStep state={state} onChange={updateState} catalog={catalog} />;
    case "DEAL_TYPE":
    case "LEAD_PATH":
      return <LeadPathStep state={state} onChange={updateState} catalog={catalog} />;
    case "ATTACH_PARTIES":
      return <AttachPartiesStep state={state} onChange={updateState} catalog={catalog} />;
    case "OUTSOURCE_TERMS":
    case "COMMERCIAL":
      return <CommercialStep state={state} onChange={updateState} catalog={catalog} />;
    case "PARTIES":
    case "CUSTOMER":
      return <CustomerStep state={state} onChange={updateState} catalog={catalog} />;
    case "VENDORSHIP":
      return <VendorshipStep state={state} onChange={updateState} catalog={catalog} />;
    case "AGENT":
      return <AgentStep state={state} onChange={updateState} catalog={catalog} />;
    case "TEAM":
      return <TeamStep state={state} onChange={updateState} catalog={catalog} />;
    case "REVIEW":
      return <ReviewFinalizeStep state={state} onChange={updateState} catalog={catalog} />;
    default:
      return null;
  }
}

export default WizardStepContent;
