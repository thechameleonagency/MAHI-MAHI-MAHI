import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreateProjectWizard } from "@/components/projects/CreateProjectWizard";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import { friendlyCommandErrorMessage } from "@/lib/commandErrorMessages";
import { buildWizardInitialState } from "@/lib/createProjectWizardInitialState";
import { filterEligibleWizardQuotations, filterOpenWizardProjects } from "@/lib/createProjectWizardPrefill";
import { executeCreateProjectWizard } from "@/lib/executeCreateProjectWizard";
import type { ProjectDraftFromCustomer } from "@/lib/createFromContext";
import type { CreateProjectWizardState } from "@/types/createProjectWizard";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { useFoundation } from "@/app/providers/FoundationProvider";

export interface CreateProjectWizardContainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillQuotationId?: string;
  prefillCustomerDraft?: ProjectDraftFromCustomer;
  /** Merged on top of URL/draft prefill (e.g. `{ source: "direct_exception" }`). */
  initialStateOverride?: Partial<CreateProjectWizardState>;
}

export function CreateProjectWizardContainer({
  open,
  onOpenChange,
  prefillQuotationId,
  prefillCustomerDraft,
  initialStateOverride,
}: CreateProjectWizardContainerProps) {
  const navigate = useNavigate();
  const { currentRole } = useAppSession();
  const { permissionService } = useFoundation();
  const {
    customers,
    partners,
    incGiverCompanies,
    vendorshipCompanies,
    agents,
    quotations,
    projects,
    loans,
    employees,
    generateId,
    allocateCustomerId,
    addCustomer,
    addExpense,
    convertEnquiryToCustomer,
    createProjectFromConfirmedQuotation,
    createProjectIntake,
    createDirectProjectException,
    updateProject,
  } = useAppData();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const canDirectException = permissionService.canPerformAction(
    currentRole,
    "project:create_direct_exception",
  );

  const initialState = useMemo(
    () => ({
      ...buildWizardInitialState({
        prefillQuotationId,
        prefillCustomerDraft,
        quotations,
        customers,
      }),
      ...initialStateOverride,
    }),
    [prefillQuotationId, prefillCustomerDraft, quotations, customers, initialStateOverride],
  );

  const catalog = useMemo(
    () => ({
      customers,
      incGiverCompanies,
      quotations: filterEligibleWizardQuotations(quotations),
      projects: filterOpenWizardProjects(projects),
      partners,
      loans,
      vendorshipCompanies,
      agents,
      employees,
      canDirectException,
    }),
    [
      customers,
      incGiverCompanies,
      quotations,
      projects,
      partners,
      loans,
      vendorshipCompanies,
      agents,
      employees,
      canDirectException,
    ],
  );

  const handleCreate = useCallback(
    async (state: CreateProjectWizardState) => {
      setIsSubmitting(true);
      try {
        const result = await executeCreateProjectWizard({
          state,
          customers,
          partners,
          incGiverCompanies,
          vendorshipCompanies,
          agents,
          quotations,
          projects,
          generateId,
          allocateCustomerId,
          addCustomer,
          addExpense,
          convertEnquiryToCustomer,
          createProjectFromConfirmedQuotation,
          createProjectIntake,
          createDirectProjectException,
          updateProject,
        });

        if (!result.ok) {
          toast({
            title: "Could not create project",
            description: friendlyCommandErrorMessage(result.error, result.error),
            variant: "destructive",
          });
          return;
        }

        if (state.source === "attach_outsourced") {
          toast({
            title: `Outsourced to ${result.attachSubcontractorName || "subcontractor"}`,
            description: `Attached to project ${result.projectId}.`,
          });
        } else if (state.source === "direct_exception") {
          const reason = result.directExceptionReason ?? "";
          toast({
            title: "Direct exception project created",
            description: reason.length > 120 ? `${reason.slice(0, 117)}…` : reason,
          });
        } else {
          toast({
            title: "Project created",
            description: "The project was created successfully.",
          });
        }

        onOpenChange(false);
        navigate(`/projects/${result.projectId}`, {
          state: result.directExceptionReason
            ? { directExceptionReason: result.directExceptionReason }
            : undefined,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      customers,
      partners,
      incGiverCompanies,
      vendorshipCompanies,
      agents,
      quotations,
      projects,
      generateId,
      allocateCustomerId,
      addCustomer,
      addExpense,
      convertEnquiryToCustomer,
      createProjectFromConfirmedQuotation,
      createProjectIntake,
      createDirectProjectException,
      updateProject,
      onOpenChange,
      navigate,
    ],
  );

  return (
    <CreateProjectWizard
      open={open}
      onOpenChange={onOpenChange}
      initialState={initialState}
      catalog={catalog}
      onCreate={handleCreate}
      isSubmitting={isSubmitting}
    />
  );
}
