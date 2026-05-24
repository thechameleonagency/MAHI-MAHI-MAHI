import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useWizardStore } from "./useWizardStore";
import { Step1DealStructure } from "./Step1DealStructure";
import { Step2Vendorship } from "./Step2Vendorship";
import { Step3SoloSource } from "./Step3SoloSource";
import { Step4ProjectDetails } from "./Step4ProjectDetails";
import { Step5Parties } from "./Step5Parties";
import { Step6Commercials } from "./Step6Commercials";
import { Step7Review } from "./Step7Review";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ArrowRight, Check } from "lucide-react";
import type { UnifiedProjectWizardState, UnifiedWizardStep } from "@/types/createProjectWizard";
import {
  getVisibleUnifiedWizardSteps,
  UNIFIED_WIZARD_STEP_LABELS,
  validateUnifiedWizardStep,
} from "@/lib/unifiedProjectWizardFlow";
import { cn } from "@/lib/utils";

interface UnifiedProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (payload: UnifiedProjectWizardState) => Promise<void>;
  initialPrefill?: Partial<UnifiedProjectWizardState>;
}

function StepNav({
  steps,
  current,
  onSelect,
}: {
  steps: UnifiedWizardStep[];
  current: UnifiedWizardStep;
  onSelect: (step: UnifiedWizardStep) => void;
}) {
  const currentIdx = steps.indexOf(current);
  return (
    <nav className="flex flex-col gap-1" aria-label="Create project steps">
      {steps.map((step, index) => {
        const isCurrent = step === current;
        const isComplete = index < currentIdx;
        return (
          <button
            key={step}
            type="button"
            onClick={() => isComplete && onSelect(step)}
            disabled={!isComplete && !isCurrent}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
              isCurrent && "bg-primary/10 text-primary font-medium",
              isComplete && "hover:bg-muted cursor-pointer",
              !isCurrent && !isComplete && "opacity-50 cursor-default",
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs",
                isComplete && "border-success bg-success/10 text-success",
                isCurrent && "border-primary bg-primary text-primary-foreground",
              )}
            >
              {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
            </span>
            {UNIFIED_WIZARD_STEP_LABELS[step]}
          </button>
        );
      })}
    </nav>
  );
}

export function UnifiedProjectWizard({
  open,
  onOpenChange,
  onComplete,
  initialPrefill,
}: UnifiedProjectWizardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const store = useWizardStore();
  const {
    currentStep,
    resetWizard,
    hydrateFromPrefill,
    nextStep,
    prevStep,
    setStep,
    dealOrigin,
    partnerModifier,
    vendorshipOwner,
    vendorshipCompanyId,
    vendorshipFeeAmount,
    paymentType,
    soloPipeline,
    selectedEnquiryId,
    selectedQuotationId,
    endCustomer,
    systemDetails,
    itemDetails,
    counterpartyId,
    capacityKw,
    projectType,
    grossContractValue,
    partnerProfitSharePct,
    mssBackendFixedRate,
    incRateBasis,
    incRateValue,
    partnerProvidesGst,
    subcontractorPayoutRate,
    projectName,
  } = store;

  const wizardState: UnifiedProjectWizardState = useMemo(
    () => ({
      dealOrigin,
      partnerModifier,
      vendorshipOwner,
      vendorshipCompanyId,
      vendorshipFeeAmount,
      paymentType,
      soloPipeline,
      selectedEnquiryId,
      selectedQuotationId,
      endCustomer,
      systemDetails,
      itemDetails,
      counterpartyId,
      capacityKw,
      projectType,
      grossContractValue,
      partnerProfitSharePct,
      mssBackendFixedRate,
      incRateBasis,
      incRateValue,
      partnerProvidesGst,
      subcontractorPayoutRate,
      projectName,
    }),
    [
      dealOrigin,
      partnerModifier,
      vendorshipOwner,
      vendorshipCompanyId,
      vendorshipFeeAmount,
      paymentType,
      soloPipeline,
      selectedEnquiryId,
      selectedQuotationId,
      endCustomer,
      systemDetails,
      itemDetails,
      counterpartyId,
      capacityKw,
      projectType,
      grossContractValue,
      partnerProfitSharePct,
      mssBackendFixedRate,
      incRateBasis,
      incRateValue,
      partnerProvidesGst,
      subcontractorPayoutRate,
      projectName,
    ],
  );

  useEffect(() => {
    if (!open) return;
    resetWizard(initialPrefill);
    if (initialPrefill) hydrateFromPrefill(initialPrefill);
  }, [open, initialPrefill, resetWizard, hydrateFromPrefill]);

  const visibleSteps = useMemo(() => getVisibleUnifiedWizardSteps(wizardState), [wizardState]);
  const currentIndex = visibleSteps.indexOf(currentStep);
  const progressPct = visibleSteps.length > 0 ? ((currentIndex + 1) / visibleSteps.length) * 100 : 0;

  useEffect(() => {
    if (!visibleSteps.includes(currentStep)) {
      setStep(visibleSteps[0] ?? "deal");
    }
  }, [visibleSteps, currentStep, setStep]);

  const handleNext = () => {
    const errors = validateUnifiedWizardStep(currentStep, wizardState);
    if (errors.length > 0) {
      toast({
        title: "Validation error",
        description: errors[0]?.message,
        variant: "destructive",
      });
      return;
    }
    nextStep();
  };

  const handleSubmit = async () => {
    const errors = visibleSteps.flatMap((step) => validateUnifiedWizardStep(step, wizardState));
    if (errors.length > 0) {
      toast({
        title: "Validation error",
        description: errors[0]?.message,
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await onComplete(wizardState);
      resetWizard();
      onOpenChange(false);
    } catch (error: unknown) {
      toast({
        title: "Creation failed",
        description: error instanceof Error ? error.message : "Unexpected error",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case "deal":
        return <Step1DealStructure />;
      case "vendorship":
        return <Step2Vendorship />;
      case "source":
        return <Step3SoloSource />;
      case "details":
        return <Step4ProjectDetails />;
      case "parties":
        return <Step5Parties />;
      case "commercials":
        return <Step6Commercials />;
      case "review":
        return <Step7Review />;
      default:
        return null;
    }
  };

  const isLast = currentIndex >= visibleSteps.length - 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <AppSheetContent size="wide" mobileFullScreen layout="bare" className="flex h-full flex-col">
        <SheetHeader className="shrink-0 border-b px-4 py-4 sm:px-6">
          <SheetTitle>Create Project</SheetTitle>
          <SheetDescription className="sr-only">
            Multi-step wizard to create a project with deal-specific tabs and billing setup.
          </SheetDescription>
          <Progress value={progressPct} className="h-1.5 mt-3" />
          <p className="text-xs text-muted-foreground">
            Step {currentIndex + 1} of {visibleSteps.length} — {UNIFIED_WIZARD_STEP_LABELS[currentStep]}
          </p>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 md:grid md:grid-cols-[12rem_minmax(0,1fr)]">
          <div className="hidden md:block border-r px-4 py-6 overflow-y-auto">
            <StepNav steps={visibleSteps} current={currentStep} onSelect={setStep} />
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 custom-scrollbar">{renderStep()}</div>
            <div className="flex shrink-0 items-center justify-between gap-2 border-t px-4 py-3 sm:px-6">
              <Button variant="outline" onClick={prevStep} disabled={currentIndex <= 0 || isSubmitting}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              {!isLast ? (
                <Button onClick={handleNext}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create project
                </Button>
              )}
            </div>
          </div>
        </div>
      </AppSheetContent>
    </Sheet>
  );
}
