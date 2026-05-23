import { z } from "zod";

export * from "./createProjectWizardLegacy";

/** Alias for legacy wizard consumers (Projects page prefill overrides). */
export type { CreateProjectWizardState } from "./createProjectWizardLegacy";

// ─── Unified 7-step create project sheet ─────────────────────────────────────

export type DealOrigin = "DIRECT" | "PARTNER" | "INC_TAKEN" | "VENDORSHIP_ONLY";
export type PartnerModifier = "PROFIT_SHARE" | "FIXED_RATE";
export type IncModifier = "LABOR_ONLY" | "LABOR_MATERIALS";
/** MSS owns the DISCOM code, or a registered code-giver company supplies it. */
export type UnifiedVendorshipOwner = "MSS" | "CODE_GIVER";
export type SoloPipelineSource = "new" | "enquiry" | "quotation";

export type UnifiedWizardStep =
  | "deal"
  | "vendorship"
  | "source"
  | "details"
  | "parties"
  | "commercials"
  | "review";

export interface UnifiedProjectWizardState {
  dealOrigin: DealOrigin;
  partnerModifier?: PartnerModifier;
  incModifier?: IncModifier;

  /** Available on every deal type — attaches subcontractor execution scope. */
  outsourceEnabled?: boolean;
  subcontractorId?: string;

  vendorshipOwner?: UnifiedVendorshipOwner;
  vendorshipCompanyId?: string;
  vendorshipFeeAmount?: number;

  soloPipeline?: SoloPipelineSource;
  selectedEnquiryId?: string;
  selectedQuotationId?: string;

  endCustomer: { name: string; phone: string; address: string; kNumber: string };
  systemDetails: {
    roofType: string;
    phase: string;
    connectionType: string;
    discom: string;
  };
  itemDetails: {
    panelMake: string;
    panelCapacityWp: number;
    panelQty: number;
    inverterMake: string;
    inverterCapacityKw: number;
    structureType: string;
  };

  counterpartyId?: string;

  capacityKw: number;
  projectType: "Residential" | "Commercial" | "Industrial";
  grossContractValue: number;

  partnerProfitSharePct?: number;
  mssBackendFixedRate?: number;
  incRateBasis?: "PER_KW" | "PER_SQFT" | "FIXED";
  incRateValue?: number;
  incMaterialCost?: number;
  subcontractorPayoutRate?: number;
  partnerProvidesGst?: boolean;

  projectName?: string;
}

const dealOriginEnum = z.enum(["DIRECT", "PARTNER", "INC_TAKEN", "VENDORSHIP_ONLY"]);

export const Step1Schema = z
  .object({
    dealOrigin: dealOriginEnum,
    partnerModifier: z.enum(["PROFIT_SHARE", "FIXED_RATE"]).optional(),
    incModifier: z.enum(["LABOR_ONLY", "LABOR_MATERIALS"]).optional(),
    outsourceEnabled: z.boolean().optional(),
    subcontractorId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.dealOrigin === "PARTNER" && !data.partnerModifier) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["partnerModifier"],
        message: "Partner deal requires a compensation model.",
      });
    }
    if (data.dealOrigin === "INC_TAKEN" && !data.incModifier) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["incModifier"],
        message: "INC Taken requires an execution scope.",
      });
    }
    if (data.outsourceEnabled && !data.subcontractorId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["subcontractorId"],
        message: "Select a subcontractor when outsourcing execution.",
      });
    }
  });

export const Step2Schema = z
  .object({
    dealOrigin: dealOriginEnum,
    incModifier: z.enum(["LABOR_ONLY", "LABOR_MATERIALS"]).optional(),
    vendorshipOwner: z.enum(["MSS", "CODE_GIVER"]).optional(),
    vendorshipCompanyId: z.string().optional(),
    vendorshipFeeAmount: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    const isLaborOnly = data.dealOrigin === "INC_TAKEN" && data.incModifier === "LABOR_ONLY";
    if (isLaborOnly) return;
    if (!data.vendorshipOwner) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vendorshipOwner"],
        message: "Select who provides the vendorship / DISCOM code.",
      });
    }
    if (data.vendorshipOwner === "CODE_GIVER" && !data.vendorshipCompanyId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vendorshipCompanyId"],
        message: "Select a vendorship code giver company.",
      });
    }
  });

export const Step3Schema = z
  .object({
    dealOrigin: dealOriginEnum,
    soloPipeline: z.enum(["new", "enquiry", "quotation"]).optional(),
    selectedEnquiryId: z.string().optional(),
    selectedQuotationId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.dealOrigin !== "DIRECT") return;
    if (!data.soloPipeline) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["soloPipeline"],
        message: "Choose how this solo project enters the pipeline.",
      });
    }
    if (data.soloPipeline === "enquiry" && !data.selectedEnquiryId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selectedEnquiryId"],
        message: "Select an enquiry to attach.",
      });
    }
    if (data.soloPipeline === "quotation" && !data.selectedQuotationId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selectedQuotationId"],
        message: "Select an approved quotation to attach.",
      });
    }
  });

export const Step4Schema = z
  .object({
    vendorshipOwner: z.enum(["MSS", "CODE_GIVER"]).optional(),
    endCustomer: z.object({
      name: z.string().min(1, "Customer name is required"),
      phone: z.string().min(10, "Valid phone is required"),
      address: z.string().min(1, "Address is required"),
      kNumber: z.string().min(1, "K-Number is required"),
    }),
    systemDetails: z.object({
      roofType: z.string(),
      phase: z.string(),
      connectionType: z.string(),
      discom: z.string(),
    }),
    itemDetails: z.object({
      panelMake: z.string(),
      panelCapacityWp: z.number(),
      panelQty: z.number(),
      inverterMake: z.string(),
      inverterCapacityKw: z.number(),
      structureType: z.string(),
    }),
  })
  .superRefine((data, ctx) => {
    if (data.vendorshipOwner !== "MSS") return;
    if (!data.systemDetails.roofType.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["systemDetails", "roofType"], message: "Roof type is required for MSS vendorship." });
    }
    if (!data.systemDetails.phase.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["systemDetails", "phase"], message: "Phase is required for MSS vendorship." });
    }
    if (!data.systemDetails.connectionType.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["systemDetails", "connectionType"], message: "Connection type is required for MSS vendorship." });
    }
    if (!data.systemDetails.discom.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["systemDetails", "discom"], message: "DISCOM is required for MSS vendorship." });
    }
    if (!data.itemDetails.panelMake.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["itemDetails", "panelMake"], message: "Panel make is required for MSS vendorship." });
    }
    if (data.itemDetails.panelCapacityWp < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["itemDetails", "panelCapacityWp"], message: "Panel capacity is required for MSS vendorship." });
    }
    if (data.itemDetails.panelQty < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["itemDetails", "panelQty"], message: "Panel quantity is required for MSS vendorship." });
    }
    if (!data.itemDetails.inverterMake.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["itemDetails", "inverterMake"], message: "Inverter make is required for MSS vendorship." });
    }
    if (data.itemDetails.inverterCapacityKw < 0.1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["itemDetails", "inverterCapacityKw"], message: "Inverter capacity is required for MSS vendorship." });
    }
    if (!data.itemDetails.structureType.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["itemDetails", "structureType"], message: "Structure type is required for MSS vendorship." });
    }
  });

export const Step5Schema = z
  .object({
    dealOrigin: dealOriginEnum,
    counterpartyId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (["PARTNER", "INC_TAKEN"].includes(data.dealOrigin) && !data.counterpartyId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["counterpartyId"],
        message: "Counterparty selection is required.",
      });
    }
  });

export const Step6Schema = z
  .object({
    dealOrigin: dealOriginEnum,
    partnerModifier: z.enum(["PROFIT_SHARE", "FIXED_RATE"]).optional(),
    incModifier: z.enum(["LABOR_ONLY", "LABOR_MATERIALS"]).optional(),
    outsourceEnabled: z.boolean().optional(),
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
  })
  .superRefine((data, ctx) => {
    if (data.dealOrigin === "PARTNER") {
      if (data.partnerModifier === "PROFIT_SHARE" && data.partnerProfitSharePct === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["partnerProfitSharePct"],
          message: "Profit share % is required.",
        });
      }
      if (data.partnerModifier === "FIXED_RATE" && data.mssBackendFixedRate === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mssBackendFixedRate"],
          message: "MSS backend fixed rate is required.",
        });
      }
      if (data.partnerProvidesGst === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["partnerProvidesGst"],
          message: "Specify whether the partner provides a GST invoice.",
        });
      }
    }
    if (data.dealOrigin === "INC_TAKEN") {
      if (!data.incRateBasis) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["incRateBasis"],
          message: "Rate basis is required.",
        });
      }
      if (data.incRateValue === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["incRateValue"],
          message: "Rate value is required.",
        });
      }
      if (data.incModifier === "LABOR_MATERIALS" && data.incMaterialCost === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["incMaterialCost"],
          message: "Material cost is required.",
        });
      }
    }
    if (data.outsourceEnabled && data.subcontractorPayoutRate === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["subcontractorPayoutRate"],
        message: "Subcontractor payout rate is required when outsourcing.",
      });
    }
  });

export function createInitialUnifiedWizardState(
  overrides?: Partial<UnifiedProjectWizardState>,
): UnifiedProjectWizardState {
  return {
    dealOrigin: "DIRECT",
    soloPipeline: "new",
    endCustomer: { name: "", phone: "", address: "", kNumber: "" },
    systemDetails: { roofType: "", phase: "", connectionType: "", discom: "" },
    itemDetails: {
      panelMake: "",
      panelCapacityWp: 0,
      panelQty: 0,
      inverterMake: "",
      inverterCapacityKw: 0,
      structureType: "",
    },
    capacityKw: 0,
    projectType: "Residential",
    grossContractValue: 0,
    outsourceEnabled: false,
    ...overrides,
  };
}
