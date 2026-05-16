import type { Partner, PartnerTransaction } from "@/types/finance";

/**
 * Partners are deal-bringers only — Profit-Share and Fixed-Rate.
 * Subcontractor and Channel are retained for execution/network roles.
 * Vendorship code companies and INC-Giver companies are separate entity types (not partners).
 */
export type PartnerCategory = "deal-bringer" | "execution" | "network";

export const PARTNER_CATEGORY_LABELS: Record<PartnerCategory, string> = {
  "deal-bringer": "Brings deals / clients",
  execution: "Execution & labour",
  network: "Network & commissions",
};

export const partnerCategoryOfType = (t: Partner["type"]): PartnerCategory => {
  switch (t) {
    case "Profit-Share":
    case "Fixed-Rate":
      return "deal-bringer";
    case "Subcontractor":
      return "execution";
    case "Channel":
      return "network";
    default:
      return "deal-bringer";
  }
};

export const PARTNER_TYPES_ORDERED: Partner["type"][] = [
  "Profit-Share",
  "Fixed-Rate",
  "Channel",
  "Subcontractor",
];

export const PARTNER_TYPE_PURPOSE: Record<Partner["type"], string> = {
  "Profit-Share":
    "Brings clients for partner EPC projects. Profit is split by agreed % after MSS costs. Partner invoices MSS for their share (or we deduct 9% if no GST invoice).",
  "Fixed-Rate":
    "Brings clients at their own sell price. MSS gets a fixed ₹/kW backend rate. Partner keeps the margin above our rate.",
  Channel:
    "Part of our vendor network. Manages external execution with a commission-based arrangement.",
  Subcontractor:
    "We give them our installation work to execute. They handle on-ground delivery and are paid by MSS.",
};

export const PARTNER_TYPE_DEAL_AFFINITY: Record<Partner["type"], string[]> = {
  "Profit-Share": ["PARTNER_EPC"],
  "Fixed-Rate": ["FIXED_EPC"],
  Channel: ["VENDOR_NETWORK"],
  Subcontractor: ["OUTSOURCED_INC"],
};

export function partnerSettlementKinds(type: Partner["type"]): PartnerTransaction["type"][] {
  switch (type) {
    case "Profit-Share":
      return ["Profit Payment", "Expense Return", "Investment"];
    case "Fixed-Rate":
      return ["Profit Payment", "Expense Return"];
    case "Channel":
      return ["Profit Payment", "Expense Return"];
    case "Subcontractor":
      return ["Profit Payment", "Expense Return"];
    default:
      return ["Profit Payment"];
  }
}

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
    case "Profit-Share":
      return [
        {
          key: "record_settlement",
          label: "Settle profit share",
          description: "Distribute agreed profit percentage for completed projects.",
        },
        baseNote,
      ];
    case "Fixed-Rate":
      return [
        {
          key: "record_settlement",
          label: "Pay backend amount",
          description: "Settlement of the fixed backend rate for delivered projects.",
        },
        baseNote,
      ];
    case "Channel":
      return [
        {
          key: "record_settlement",
          label: "Record commission",
          description: "Commission payment for network-managed project execution.",
        },
        baseNote,
      ];
    case "Subcontractor":
      return [
        {
          key: "record_settlement",
          label: "Pay subcontractor",
          description: "Payment to the subcontractor for installation work they executed.",
        },
        baseNote,
      ];
    default:
      return [{ key: "record_settlement", label: "Record movement", description: "" }, baseNote];
  }
}
