export type QuotationStatus = "draft" | "sent" | "approved" | "rejected" | "confirmed";

const transitions: Record<QuotationStatus, QuotationStatus[]> = {
  draft: ["sent"],
  sent: ["approved", "rejected", "draft"],
  rejected: ["draft"],
  approved: ["confirmed"],
  confirmed: [],
};

export const canTransitionQuotationStatus = (from: QuotationStatus, to: QuotationStatus): boolean => {
  return transitions[from].includes(to);
};
