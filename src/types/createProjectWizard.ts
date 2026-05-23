import { z } from "zod";

// Core Deal Origin Types
export type DealOrigin = "DIRECT" | "PARTNER" | "INC_TAKEN" | "OUTSOURCED_INC" | "VENDORSHIP_ONLY";
export type PartnerModifier = "PROFIT_SHARE" | "FIXED_RATE";
export type IncModifier = "LABOR_ONLY" | "LABOR_MATERIALS";

export type VendorshipOwner = "MSS" | "PARTNER" | "THIRD_PARTY";

// Unified State Interface
export interface UnifiedProjectWizardState {
  // Step 1
  dealOrigin: DealOrigin;
  partnerModifier?: PartnerModifier;
  incModifier?: IncModifier;
  
  // Step 2
  vendorshipOwner?: VendorshipOwner; // Irrelevant for INC Taken - Labor Only
  vendorshipFeeAmount?: number; // MSS charging counterparty
  thirdPartyCompanyName?: string; // If Third Party code
  thirdPartyFeeAmount?: number;

  // Step 3
  endCustomer: { name: string; phone: string; address: string; kNumber: string };
  counterpartyId?: string; // Async CRM Lookup

  // Step 4
  capacityKw: number;
  projectType: "Residential" | "Commercial" | "Industrial";
  grossContractValue: number;
  
  // Economics
  partnerProfitSharePct?: number;
  mssBackendFixedRate?: number;
  incRateBasis?: "PER_KW" | "PER_SQFT" | "FIXED";
  incRateValue?: number;
  incMaterialCost?: number;
  subcontractorPayoutRate?: number;
  partnerProvidesGst?: boolean;

  // Added for submission mapping
  projectName?: string; 
}

// Zod Schemas for Validation

export const Step1Schema = z.object({
  dealOrigin: z.enum(["DIRECT", "PARTNER", "INC_TAKEN", "OUTSOURCED_INC", "VENDORSHIP_ONLY"]),
  partnerModifier: z.enum(["PROFIT_SHARE", "FIXED_RATE"]).optional(),
  incModifier: z.enum(["LABOR_ONLY", "LABOR_MATERIALS"]).optional(),
}).superRefine((data, ctx) => {
  if (data.dealOrigin === "PARTNER" && !data.partnerModifier) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["partnerModifier"], message: "Partner deal requires a modifier." });
  }
  if (data.dealOrigin === "INC_TAKEN" && !data.incModifier) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["incModifier"], message: "INC Taken requires a modifier." });
  }
});

export const Step2Schema = z.object({
  dealOrigin: z.enum(["DIRECT", "PARTNER", "INC_TAKEN", "OUTSOURCED_INC", "VENDORSHIP_ONLY"]), // passed in for context
  incModifier: z.enum(["LABOR_ONLY", "LABOR_MATERIALS"]).optional(),
  vendorshipOwner: z.enum(["MSS", "PARTNER", "THIRD_PARTY"]).optional(),
  vendorshipFeeAmount: z.number().optional(),
  thirdPartyCompanyName: z.string().optional(),
  thirdPartyFeeAmount: z.number().optional(),
}).superRefine((data, ctx) => {
  const isLaborOnly = data.dealOrigin === "INC_TAKEN" && data.incModifier === "LABOR_ONLY";
  if (isLaborOnly) return; // Skip validation entirely

  if (!data.vendorshipOwner) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["vendorshipOwner"], message: "Vendorship owner is required." });
  }

  if (data.vendorshipOwner === "MSS" && (data.dealOrigin === "PARTNER" || data.dealOrigin === "INC_TAKEN")) {
     // Usually there's a fee, but let's not strictly require >0 unless specified, but it must be a number
     if (data.vendorshipFeeAmount === undefined) {
         ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["vendorshipFeeAmount"], message: "Vendorship fee amount required." });
     }
  }

  if (data.vendorshipOwner === "THIRD_PARTY") {
    if (!data.thirdPartyCompanyName?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["thirdPartyCompanyName"], message: "Third party company name required." });
    }
    if (data.thirdPartyFeeAmount === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["thirdPartyFeeAmount"], message: "Third party fee required." });
    }
  }
});

export const Step3Schema = z.object({
  dealOrigin: z.enum(["DIRECT", "PARTNER", "INC_TAKEN", "OUTSOURCED_INC", "VENDORSHIP_ONLY"]),
  endCustomer: z.object({
    name: z.string().min(1, "Customer name is required"),
    phone: z.string().min(10, "Valid phone is required"),
    address: z.string().min(1, "Address is required"),
    kNumber: z.string().min(1, "K-Number is mandatory globally"),
  }),
  counterpartyId: z.string().optional(),
}).superRefine((data, ctx) => {
  if (["PARTNER", "INC_TAKEN", "OUTSOURCED_INC"].includes(data.dealOrigin) && !data.counterpartyId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["counterpartyId"], message: "Counterparty selection is required for this deal origin." });
  }
});

export const Step4Schema = z.object({
  dealOrigin: z.enum(["DIRECT", "PARTNER", "INC_TAKEN", "OUTSOURCED_INC", "VENDORSHIP_ONLY"]),
  partnerModifier: z.enum(["PROFIT_SHARE", "FIXED_RATE"]).optional(),
  incModifier: z.enum(["LABOR_ONLY", "LABOR_MATERIALS"]).optional(),
  
  capacityKw: z.number().min(0.1, "Capacity must be greater than 0"),
  projectType: z.enum(["Residential", "Commercial", "Industrial"]),
  grossContractValue: z.number().min(0, "Gross contract value must be at least 0"),
  
  partnerProfitSharePct: z.number().optional(),
  mssBackendFixedRate: z.number().optional(),
  incRateBasis: z.enum(["PER_KW", "PER_SQFT", "FIXED"]).optional(),
  incRateValue: z.number().optional(),
  incMaterialCost: z.number().optional(),
  subcontractorPayoutRate: z.number().optional(),
  partnerProvidesGst: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.dealOrigin === "PARTNER") {
    if (data.partnerModifier === "PROFIT_SHARE" && data.partnerProfitSharePct === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["partnerProfitSharePct"], message: "Profit share % is required." });
    }
    if (data.partnerModifier === "FIXED_RATE" && data.mssBackendFixedRate === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["mssBackendFixedRate"], message: "MSS Backend fixed rate is required." });
    }
    if (data.partnerProvidesGst === undefined) {
       ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["partnerProvidesGst"], message: "Must specify if Partner provides GST." });
    }
  }

  if (data.dealOrigin === "INC_TAKEN") {
    if (!data.incRateBasis) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["incRateBasis"], message: "Rate basis is required." });
    }
    if (data.incRateValue === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["incRateValue"], message: "Rate value is required." });
    }
    if (data.incModifier === "LABOR_MATERIALS" && data.incMaterialCost === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["incMaterialCost"], message: "Material cost is required." });
    }
  }

  if (data.dealOrigin === "OUTSOURCED_INC" && data.subcontractorPayoutRate === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["subcontractorPayoutRate"], message: "Subcontractor payout rate is required." });
  }
});

// Default State Factory
export function createInitialUnifiedWizardState(): UnifiedProjectWizardState {
  return {
    dealOrigin: "DIRECT",
    endCustomer: { name: "", phone: "", address: "", kNumber: "" },
    capacityKw: 0,
    projectType: "Residential",
    grossContractValue: 0,
  };
}
