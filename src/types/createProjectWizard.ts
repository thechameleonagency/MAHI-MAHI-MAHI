import { z } from "zod";
import type { ProjectPaymentType } from "@/domain/project/projectPaymentType";

export * from "./createProjectWizardLegacy";

/** Alias for legacy wizard consumers (Projects page prefill overrides). */
export type { CreateProjectWizardState } from "./createProjectWizardLegacy";

// ─── Unified 7-step create project sheet ─────────────────────────────────────

export type DealOrigin = "DIRECT" | "PARTNER" | "INC_TAKEN" | "VENDORSHIP_ONLY";
export type PartnerModifier = "PROFIT_SHARE" | "FIXED_RATE";
/** MSS owns the DISCOM code, a registered code-giver company supplies it, or partner uses their own. */
export type UnifiedVendorshipOwner = "MSS" | "CODE_GIVER" | "PARTNER_OWNED";
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

  vendorshipOwner?: UnifiedVendorshipOwner;
  vendorshipCompanyId?: string;
  vendorshipFeeAmount?: number;
  /** Bank loan vs cash file — required when MSS vendorship code is used. */
  paymentType?: ProjectPaymentType;

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
  partnerProvidesGst?: boolean;

  projectName?: string;
}

const dealOriginEnum = z.enum(["DIRECT", "PARTNER", "INC_TAKEN", "VENDORSHIP_ONLY"]);

export const Step1Schema = z.object({
  dealOrigin: dealOriginEnum,
  partnerModifier: z.enum(["PROFIT_SHARE", "FIXED_RATE"]).optional(),
}).superRefine((data, ctx) => {
  if (data.dealOrigin === "PARTNER" && !data.partnerModifier) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["partnerModifier"],
      message: "Partner deal requires a compensation model.",
    });
  }
});

export const Step2Schema = z
  .object({
    dealOrigin: dealOriginEnum,
    vendorshipOwner: z.enum(["MSS", "CODE_GIVER", "PARTNER_OWNED"]).optional(),
    vendorshipCompanyId: z.string().optional(),
    vendorshipFeeAmount: z.number().optional(),
    paymentType: z.enum(["cash", "loan", "cash-and-loan"]).optional(),
    capacityKw: z.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.dealOrigin === "VENDORSHIP_ONLY") return;
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
    if (data.vendorshipOwner === "PARTNER_OWNED" && data.dealOrigin !== "PARTNER") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["vendorshipOwner"],
        message: "Partner-owned code is only valid for partner network deals.",
      });
    }
    if (data.vendorshipOwner === "MSS") {
      const feeRequired = data.dealOrigin !== "DIRECT";
      if (
        feeRequired &&
        (data.vendorshipFeeAmount === undefined || data.vendorshipFeeAmount < 0)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["vendorshipFeeAmount"],
          message: "Enter the vendorship fee amount.",
        });
      }
      if (!data.paymentType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["paymentType"],
          message: "Select bank file (loan) or cash file.",
        });
      }
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
    dealOrigin: dealOriginEnum,
    vendorshipOwner: z.enum(["MSS", "CODE_GIVER", "PARTNER_OWNED"]).optional(),
    endCustomer: z.object({
      name: z.string(),
      phone: z.string(),
      address: z.string(),
      kNumber: z.string(),
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
  const isPartnerExternal = data.vendorshipOwner === "PARTNER_OWNED";
  const isMss = data.vendorshipOwner === "MSS";
  const isVendorshipOnly = data.dealOrigin === "VENDORSHIP_ONLY";

  if (isVendorshipOnly) {
    if (!data.endCustomer.name.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endCustomer", "name"], message: "Counterparty name is required." });
    }
    return;
  }

  if (isPartnerExternal) {
    if (!data.endCustomer.address.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endCustomer", "address"], message: "Site address is required." });
    }
    return;
  }

  if (!data.endCustomer.name.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endCustomer", "name"], message: "Customer name is required." });
  }
  if (data.endCustomer.phone.length < 10) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endCustomer", "phone"], message: "Valid phone is required." });
  }
  if (!data.endCustomer.address.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endCustomer", "address"], message: "Address is required." });
  }

  if (data.dealOrigin === "INC_TAKEN" && !isMss) {
    return;
  }

  if (isMss || !data.vendorshipOwner) {
    if (!data.endCustomer.kNumber.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endCustomer", "kNumber"], message: "K-Number is required for MSS vendorship." });
    }
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
    vendorshipOwner: z.enum(["MSS", "CODE_GIVER", "PARTNER_OWNED"]).optional(),
    paymentType: z.enum(["cash", "loan", "cash-and-loan"]).optional(),
    capacityKw: z.number().min(0.1, "Capacity must be greater than 0"),
    projectType: z.enum(["Residential", "Commercial", "Industrial"]),
    grossContractValue: z.number().min(0, "Gross contract value must be at least 0"),
    partnerProfitSharePct: z.number().optional(),
    mssBackendFixedRate: z.number().optional(),
    incRateBasis: z.enum(["PER_KW", "PER_SQFT", "FIXED"]).optional(),
    incRateValue: z.number().optional(),
    partnerProvidesGst: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.dealOrigin === "VENDORSHIP_ONLY" && !data.paymentType) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paymentType"],
        message: "Select bank file (loan) or cash file.",
      });
    }
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
    ...overrides,
  };
}
