import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UnifiedProjectWizard } from "./wizard/UnifiedProjectWizard";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import { friendlyCommandErrorMessage } from "@/lib/commandErrorMessages";
import type { Invoice } from "@/types/finance";

export interface CreateProjectWizardContainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectWizardContainer({
  open,
  onOpenChange,
}: CreateProjectWizardContainerProps) {
  const navigate = useNavigate();
  const {
    addProject,
    addInvoice,
    generateId,
  } = useAppData();

  const handleCreate = useCallback(
    async (payload: any) => {
      try {
        const projectId = generateId("PRJ");
        const dateNow = new Date().toISOString();
        
        // Execute the Creation payload mapping
        const newProject = {
          id: projectId,
          ...payload,
          lifecycleStatus: "New",
          status: "New",
          createdAt: dateNow,
          startDate: dateNow.split("T")[0],
          amountReceived: 0,
          amountInvoiced: 0,
          executionLineItems: [],
          siteChecklist: [],
        };
        
        await addProject(newProject);

        // ==========================================
        // PHASE 4: AUTOMATED GENESIS DRAFTS
        // ==========================================
        
        // 1. Client Draft Invoice
        // Axiom 1: If MSS owns vendorship, we MUST bill the client.
        if (payload.vendorshipOwner === "MSS") {
          const clientInvoice: Invoice = {
            id: generateId("INV"),
            invoiceNumber: `DRAFT-${projectId}-C`,
            type: "invoice",
            documentTypeSource: "user",
            customerId: payload.client, // Simplification for prototype (should be customerId)
            customerName: payload.client,
            customerContact: payload.clientPhone,
            projectId: projectId,
            projectName: payload.name,
            items: [{
              description: `Solar EPC Execution - ${payload.capacity}`,
              hsn: "8541",
              quantity: 1,
              rate: payload.contractAmount,
              gstRate: 0,
            }],
            services: [],
            subtotal: payload.contractAmount,
            cgst: 0,
            sgst: 0,
            igst: 0,
            total: payload.contractAmount,
            status: "draft",
            invoiceDate: dateNow.split("T")[0],
            dueDate: dateNow.split("T")[0],
            createdAt: dateNow,
          };
          addInvoice(clientInvoice);
        }

        // 2. B2B Receivable Draft (Partner / Third Party)
        // Axiom 2: If Partner/Third Party owns code, MSS bills them for the Backend Rate.
        if (payload.dealOrigin === "PARTNER" && payload.vendorshipOwner !== "MSS") {
          const backendTotal = (payload.mssBackendFixedRate || 0) * (parseFloat(payload.capacity) || 0);
          
          if (backendTotal > 0) {
            const b2bInvoice: Invoice = {
              id: generateId("INV"),
              invoiceNumber: `DRAFT-${projectId}-B2B`,
              type: "invoice",
              documentTypeSource: "user",
              customerId: payload.counterpartyId || "UNKNOWN_PARTNER",
              customerName: "B2B Counterparty",
              projectId: projectId,
              projectName: payload.name,
              items: [],
              services: [{
                description: `B2B Backend Execution Fee - ${payload.capacity}`,
                sac: "9983",
                rate: backendTotal,
                gstRate: payload.partnerProvidesGst === false ? 0 : 18,
              }],
              subtotal: backendTotal,
              cgst: 0,
              sgst: 0,
              igst: 0,
              total: backendTotal, // Simplified GST math for prototype draft
              status: "draft",
              invoiceDate: dateNow.split("T")[0],
              dueDate: dateNow.split("T")[0],
              createdAt: dateNow,
            };
            addInvoice(b2bInvoice);
          }
        }
        
        toast({
          title: "Project created",
          description: "Genesis drafts generated successfully.",
        });

        navigate(`/projects/${projectId}`);
      } catch (err: any) {
         toast({
            title: "Could not create project",
            description: friendlyCommandErrorMessage(err, "Creation failed"),
            variant: "destructive",
          });
          throw err; 
      }
    },
    [addProject, addInvoice, generateId, navigate]
  );

  return (
    <UnifiedProjectWizard
      open={open}
      onOpenChange={onOpenChange}
      onComplete={handleCreate}
    />
  );
}
