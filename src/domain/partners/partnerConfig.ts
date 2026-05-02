import type { Partner, PartnerTransaction } from "@/types/finance";

/** How MSS classifies operational partners vs project economics (aligned with Partnership EPC flows). */
export type PartnerCategory = "equity" | "execution" | "supply";

export const PARTNER_CATEGORY_LABELS: Record<PartnerCategory, string> = {
  equity: "Equity & capital",
  execution: "EPC execution",
  supply: "Supply & services",
};

export const partnerCategoryOfType = (t: Partner["type"]): PartnerCategory => {
  switch (t) {
    case "Investor":
    case "Co-Owner":
    case "Money-Only":
      return "equity";
    case "Contractor":
      return "execution";
    default:
      return "supply";
  }
};

export const PARTNER_TYPES_ORDERED: Partner["type"][] = [
  "Investor",
  "Co-Owner",
  "Money-Only",
  "Contractor",
  "Service-Provider",
  "Material-Provider",
  "Labour-Provider",
  "Transport-Provider",
];

/** One-line expectation for list/detail copy (product language, matches BRD themes). */
export const PARTNER_TYPE_PURPOSE: Record<Partner["type"], string> = {
  "Investor": "Adds capital against agreed share — profit settled from company pool.",
  "Co-Owner": "Operational co-promoter — vote on economics alongside MSS on shared projects.",
  "Money-Only": "Passive capital partner — cheque/equity only; no operational control.",
  Contractor: "Subcontracts part or whole of EPC delivery — billed on milestones / completion.",
  "Service-Provider": "Design, approvals, AMC, or liaison — fee or success-based.",
  "Material-Provider": "Structured supply bills (panels, structural, cabling) booked to project.",
  "Labour-Provider": "Specialist labour gangs / OEM crews — routed through WO and site.",
  "Transport-Provider": "Site logistics freight — billed per lift or KM slab.",
};

/** Allowed settlement line types shown in dialogs (Finance model must stay consistent). */
export function partnerSettlementKinds(type: Partner["type"]): PartnerTransaction["type"][] {
  switch (type) {
    case "Investor":
    case "Co-Owner":
    case "Money-Only":
      return ["Investment", "Profit Payment", "Investment Return", "Expense Return"];
    case "Contractor":
      return ["Profit Payment", "Expense Return"];
    case "Material-Provider":
      return ["Material Supply", "Profit Payment"];
    case "Labour-Provider":
      return ["Labour Supply", "Profit Payment"];
    case "Transport-Provider":
      return ["Transport Supply", "Profit Payment"];
    case "Service-Provider":
      return ["Expense Return", "Profit Payment", "Investment Return"];
    default:
      return ["Profit Payment"];
  }
}

/** Primary toolbar actions on Partner detail — keys drive UI/dialogs. */
export type PartnerUiAction =
  | "record_settlement"
  | "capital_call"
  | "link_project_note";

export function partnerToolbarActions(type: Partner["type"]): { key: PartnerUiAction; label: string; description: string }[] {
  const baseNote = {
    key: "link_project_note" as const,
    label: "Projects",
    description: "See roles on linked projects below.",
  };
  switch (type) {
    case "Investor":
    case "Money-Only":
      return [
        {
          key: "capital_call",
          label: "Capital / drawdown",
          description: "Record fresh investment routed to MSS pool or a site bucket.",
        },
        {
          key: "record_settlement",
          label: "Settle dues",
          description: "Profit distribution or return-of-capital with voucher backing.",
        },
        baseNote,
      ];
    case "Co-Owner":
      return [
        {
          key: "capital_call",
          label: "Equity contribution",
          description: "Log additional promoter equity for an active project.",
        },
        {
          key: "record_settlement",
          label: "Partner settlement",
          description: "Share of profit, expense recovery, or internal transfer.",
        },
        baseNote,
      ];
    case "Contractor":
      return [
        {
          key: "record_settlement",
          label: "Pay contractor",
          description: "Milestone or net-off against scope (maps to partner settlement).",
        },
        baseNote,
      ];
    case "Material-Provider":
    case "Labour-Provider":
    case "Transport-Provider":
      return [
        {
          key: "record_settlement",
          label: "Record inward supply",
          description: `Log ${type.includes("Labour") ? "labour WO" : type.includes("Transport") ? "freight invoice" : "material bill"} against GST line.`,
        },
        baseNote,
      ];
    case "Service-Provider":
      return [
        {
          key: "record_settlement",
          label: "Service fee / commission",
          description: "Channel, design retainers, liaison — matches Expense Return / Profit Payment.",
        },
        baseNote,
      ];
    default:
      return [{ key: "record_settlement", label: "Record movement", description: "" }, baseNote];
  }
}
