import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useWizardStore } from "./useWizardStore";
import { Step1DealStructure } from "./Step1DealStructure";
import { Step2Vendorship } from "./Step2Vendorship";
import { Step3Parties } from "./Step3Parties";
import { Step4Commercials } from "./Step4Commercials";
import { Step5Review } from "./Step5Review";
import { 
  Step1Schema, 
  Step2Schema, 
  Step3Schema, 
  Step4Schema 
} from "@/types/createProjectWizard";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react";

interface UnifiedProjectWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (payload: any) => Promise<void>;
}

export function UnifiedProjectWizard({ open, onOpenChange, onComplete }: UnifiedProjectWizardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const state = useWizardStore();
  const { currentStep, nextStep, prevStep, resetWizard } = state;

  const totalSteps = 5;

  const handleNext = () => {
    try {
      // Validate current step before advancing
      if (currentStep === 1) Step1Schema.parse(state);
      if (currentStep === 2) Step2Schema.parse(state);
      if (currentStep === 3) Step3Schema.parse(state);
      if (currentStep === 4) Step4Schema.parse(state);

      nextStep();
    } catch (error: any) {
      if (error.issues && error.issues.length > 0) {
        toast({
          title: "Validation Error",
          description: error.issues[0].message,
          variant: "destructive",
        });
      }
    }
  };

  const handleBack = () => {
    prevStep();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Final payload adapter mapping UnifiedState -> Backend Payload
      const payload = {
        name: state.projectName || `${state.endCustomer.name} - ${state.capacityKw}kW`,
        dealOrigin: state.dealOrigin,
        client: state.endCustomer.name,
        clientPhone: state.endCustomer.phone,
        clientAddress: state.endCustomer.address,
        location: state.endCustomer.address,
        kNumber: state.endCustomer.kNumber,
        capacity: `${state.capacityKw} kW`,
        projectType: state.projectType,
        contractAmount: state.grossContractValue,
        
        // Advanced Mapping
        vendorshipOwner: state.vendorshipOwner,
        vendorshipFeeAmount: state.vendorshipFeeAmount,
        thirdPartyCompanyName: state.thirdPartyCompanyName,
        thirdPartyFeeAmount: state.thirdPartyFeeAmount,

        // Economics
        partnerProfitSharePct: state.partnerProfitSharePct,
        mssBackendFixedRate: state.mssBackendFixedRate,
        incRateBasis: state.incRateBasis,
        incRateValue: state.incRateValue,
        subcontractorPayoutRate: state.subcontractorPayoutRate,
        partnerProvidesGst: state.partnerProvidesGst,
        counterpartyId: state.counterpartyId,
      };

      await onComplete(payload);
      
      // Cleanup on success
      resetWizard();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Creation Failed",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    // If closing, we don't reset. LocalStorage handles draft persistence.
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
        </DialogHeader>

        <div className="py-2">
          <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2 text-right">
            Step {currentStep} of {totalSteps}
          </p>
        </div>

        <div className="py-4 min-h-[400px]">
          {currentStep === 1 && <Step1DealStructure />}
          {currentStep === 2 && <Step2Vendorship />}
          {currentStep === 3 && <Step3Parties />}
          {currentStep === 4 && <Step4Commercials />}
          {currentStep === 5 && <Step5Review />}
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {currentStep < totalSteps ? (
            <Button onClick={handleNext}>
              Next Step
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
             <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Project & Genesis Drafts
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
