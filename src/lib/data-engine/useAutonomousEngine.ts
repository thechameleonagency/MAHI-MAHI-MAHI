import { useCallback, useRef } from "react";
import { useAppData } from "@/contexts/AppDataContext";
import { useDataEngineStore } from "./useDataEngineStore";
import { createId } from "@/lib/idFactory";
import type { Enquiry, Project, Customer, Quotation } from "@/types/project";
import { addDays } from "date-fns";

export function useAutonomousEngine() {
  const context = useAppData();
  const store = useDataEngineStore();
  const engineRef = useRef<number | null>(null);

  const runFlow = useCallback(async () => {
    if (useDataEngineStore.getState().status !== "running") return;

    try {
      // 1. CREATE ENQUIRY FLOW
      store.setActiveFlow("Creating Enquiry");
      store.addLog("info", "Starting new Enquiry flow");
      
      const enquiryId = createId("ENQ");
      const customerName = `Simulated Customer ${Math.floor(Math.random() * 10000)}`;
      
      const enquiry: Enquiry = {
        id: enquiryId,
        date: new Date().toISOString(),
        customerName,
        phone: "9999999999",
        status: "new",
        source: "walk_in",
        requirement: "Simulation Requirement",
        followUpDate: addDays(new Date(), 2).toISOString(),
        history: [],
      };

      const resEnq = await context.addEnquiry(enquiry);
      if (!resEnq.ok) throw new Error(resEnq.error ?? "Failed to create Enquiry");
      store.incrementCounter("enquiries");
      store.addLog("success", `Created Enquiry ${enquiryId}`);

      // Optional pause to prevent thread locking
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (useDataEngineStore.getState().status !== "running") return;

      // 2. CONVERT ENQUIRY TO CUSTOMER (Quotation stage)
      store.setActiveFlow("Converting Enquiry to Customer & Quotation");
      const resConv = await context.convertEnquiryToCustomer(enquiryId);
      if (!resConv.ok) throw new Error(resConv.error ?? "Failed to convert Enquiry");
      
      const customerId = resConv.customerId!;
      store.addLog("success", `Converted Enquiry to Customer ${customerId}`);

      const quotationId = createId("QTN");
      const quotation: Quotation = {
        id: quotationId,
        enquiryId,
        customerId,
        projectId: "",
        date: new Date().toISOString(),
        validUntil: addDays(new Date(), 15).toISOString(),
        status: "draft",
        items: [],
        sections: [],
        paymentTerms: "100% advance",
        notes: "Simulated quotation",
        history: [],
        version: 1,
        shareHistory: [],
        commercialAmount: 500000,
        amount: 500000,
        paymentType: "commercial",
      };

      const resQtn = await context.addQuotation(quotation);
      if (!resQtn.ok) throw new Error(resQtn.error ?? "Failed to create Quotation");
      store.incrementCounter("quotations");

      await new Promise((resolve) => setTimeout(resolve, 500));
      if (useDataEngineStore.getState().status !== "running") return;

      // Phase 9: Dense Edge-Case Simulation
      // 20% chance to cancel quotation
      if (Math.random() < 0.20) {
        store.setActiveFlow("Simulating Edge Case: Cancelled Quotation");
        await context.transitionQuotationStatus(quotationId, "cancelled");
        store.addLog("warn", `Edge Case: Cancelled Quotation ${quotationId}`);
        // Stop flow here for this sequence
        return;
      }

      // 3. APPROVE QUOTATION
      store.setActiveFlow("Approving Quotation");
      await context.transitionQuotationStatus(quotationId, "approved");
      store.addLog("success", `Approved Quotation ${quotationId}`);

      // 4. CREATE PROJECT FROM QUOTATION
      store.setActiveFlow("Creating Project");
      const project: Project = {
        id: createId("PRJ"),
        name: `${customerName} Project`,
        customerId,
        quotationId,
        enquiryId,
        startDate: new Date().toISOString(),
        status: "pipeline",
        lifecycleStatus: "pipeline",
        projectType: "SOLO_EPC",
        projectCategory: "residential",
        projectValue: 500000,
        amountInvoiced: 0,
        amountReceived: 0,
        history: [],
      };

      const resPrj = await context.createProjectFromConfirmedQuotation(project);
      if (!resPrj.ok) throw new Error(resPrj.error ?? "Failed to create Project");
      store.incrementCounter("projects");
      store.addLog("success", `Created Project ${project.id}`);

      // Advance progress
      store.setProgress(Math.min((store.progress + 1) % 100, 100));

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      store.addLog("error", `Flow Failed: ${msg}`);
      store.setStatus("error");
      return;
    }

    // Schedule next iteration if still running
    if (useDataEngineStore.getState().status === "running") {
      engineRef.current = window.setTimeout(runFlow, 2000); // 2s delay between full flows
    }
  }, [context, store]);

  const start = useCallback(() => {
    store.setStatus("running");
    store.addLog("info", "Data Engine Started");
    runFlow();
  }, [runFlow, store]);

  const pause = useCallback(() => {
    store.setStatus("paused");
    store.addLog("warn", "Data Engine Paused");
    if (engineRef.current) clearTimeout(engineRef.current);
  }, [store]);

  const stop = useCallback(() => {
    store.setStatus("idle");
    store.setActiveFlow(null);
    store.addLog("info", "Data Engine Stopped");
    if (engineRef.current) clearTimeout(engineRef.current);
  }, [store]);

  return { start, pause, stop };
}
