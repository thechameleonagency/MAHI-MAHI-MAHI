import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { UnifiedProjectWizard } from "./wizard/UnifiedProjectWizard";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import { friendlyCommandErrorMessage } from "@/lib/commandErrorMessages";
import type { Invoice } from "@/types/finance";
import type { UnifiedProjectWizardState } from "@/types/createProjectWizard";
import {
  buildProjectFromUnifiedWizardState,
  buildIntakeFromUnifiedWizardState,
  prefillUnifiedWizardFromQuotation,
} from "@/lib/buildProjectFromUnifiedWizardState";
import type { ProjectDraftFromCustomer } from "@/lib/createFromContext";

export interface CreateProjectWizardContainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillQuotationId?: string;
  prefillCustomerDraft?: ProjectDraftFromCustomer;
  initialStateOverride?: Partial<UnifiedProjectWizardState>;
}

export function CreateProjectWizardContainer({
  open,
  onOpenChange,
  prefillQuotationId,
  prefillCustomerDraft,
  initialStateOverride,
}: CreateProjectWizardContainerProps) {
  const navigate = useNavigate();
  const appData = useAppData();
  const {
    addInvoice,
    generateId,
    partners,
    incGiverCompanies,
    vendorshipCompanies,
    enquiries,
    quotations,
    createProjectFromConfirmedQuotation,
    createProjectIntake,
  } = appData;

  const initialPrefill = useMemo((): Partial<UnifiedProjectWizardState> | undefined => {
    const base: Partial<UnifiedProjectWizardState> = { ...initialStateOverride };
    if (prefillQuotationId) {
      const quotation = quotations.find((q) => q.id === prefillQuotationId);
      if (quotation) {
        const linkedEnquiry = quotation.enquiryId
          ? enquiries.find((e) => e.id === quotation.enquiryId)
          : undefined;
        Object.assign(base, prefillUnifiedWizardFromQuotation(quotation, linkedEnquiry));
      }
    }
    if (prefillCustomerDraft) {
      base.endCustomer = {
        name: prefillCustomerDraft.clientName ?? "",
        phone: prefillCustomerDraft.clientPhone ?? "",
        address: prefillCustomerDraft.location ?? "",
        kNumber: prefillCustomerDraft.kNumber ?? "",
      };
      base.projectName = prefillCustomerDraft.projectName;
      base.capacityKw = parseFloat(String(prefillCustomerDraft.capacity ?? "").replace(/[^\d.]/g, "")) || 0;
    }
    return Object.keys(base).length > 0 ? base : undefined;
  }, [initialStateOverride, prefillQuotationId, prefillCustomerDraft, quotations, enquiries]);

  const handleCreate = useCallback(
    async (state: UnifiedProjectWizardState) => {
      try {
        const ctx = {
          generateId,
          partners,
          incGiverCompanies,
          vendorshipCompanies,
          enquiries,
          quotations,
        };
        const projectDraft = buildProjectFromUnifiedWizardState(state, ctx);
        const intake = buildIntakeFromUnifiedWizardState(state, ctx);

        const result =
          state.soloPipeline === "quotation" && projectDraft.quotationId
            ? await createProjectFromConfirmedQuotation(projectDraft)
            : await createProjectIntake({
                project: projectDraft,
                intake,
                quotationId: projectDraft.quotationId,
              });

        if (!result.ok) {
          throw new Error(result.error ?? "Could not create project");
        }

        const projectId = result.projectId ?? projectDraft.id;

        if (state.vendorshipOwner === "MSS") {
          const clientInvoice: Invoice = {
            id: generateId("INV"),
            invoiceNumber: `DRAFT-${projectId}-C`,
            type: "invoice",
            documentTypeSource: "user",
            customerId: projectDraft.customerId ?? projectDraft.client,
            customerName: projectDraft.client,
            customerContact: state.endCustomer.phone,
            projectId,
            projectName: projectDraft.name,
            items: [
              {
                description: `Solar EPC — ${projectDraft.capacity}`,
                hsn: "8541",
                quantity: 1,
                rate: projectDraft.contractAmount,
                gstRate: 0,
              },
            ],
            services: [],
            subtotal: projectDraft.contractAmount,
            cgst: 0,
            sgst: 0,
            igst: 0,
            total: projectDraft.contractAmount,
            status: "draft",
            invoiceDate: new Date().toISOString().split("T")[0],
            dueDate: new Date().toISOString().split("T")[0],
            createdAt: new Date().toISOString(),
          };
          addInvoice(clientInvoice);
        }

        toast({
          title: "Project created",
          description: "Project saved with genesis billing drafts where applicable.",
        });

        navigate(`/projects/${projectId}`);
      } catch (err: unknown) {
        toast({
          title: "Could not create project",
          description: friendlyCommandErrorMessage(err, "Creation failed"),
          variant: "destructive",
        });
        throw err;
      }
    },
    [
      addInvoice,
      generateId,
      partners,
      incGiverCompanies,
      vendorshipCompanies,
      enquiries,
      quotations,
      createProjectFromConfirmedQuotation,
      createProjectIntake,
      navigate,
    ],
  );

  return (
    <UnifiedProjectWizard
      open={open}
      onOpenChange={onOpenChange}
      onComplete={handleCreate}
      initialPrefill={initialPrefill}
    />
  );
}
