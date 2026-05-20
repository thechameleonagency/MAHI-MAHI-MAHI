export type QuotationStatus =
  | "draft"
  | "sent"
  | "approved"
  | "rejected"
  | "withdrawn"
  | "converted_to_project";

const transitions: Record<QuotationStatus, QuotationStatus[]> = {
  draft: ["sent", "rejected", "withdrawn"],
  sent: ["approved", "rejected", "withdrawn", "draft"],
  approved: ["converted_to_project", "rejected", "withdrawn"],
  rejected: [],
  withdrawn: [],
  converted_to_project: [],
};

export const canTransitionQuotationStatus = (from: QuotationStatus, to: QuotationStatus): boolean => {
  return transitions[from].includes(to);
};
