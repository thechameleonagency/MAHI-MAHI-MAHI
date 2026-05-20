import type { QuotationStatus } from "@/domain/stateMachines/quotationStateMachine";

/** Statuses that cannot be edited in the create/edit form (use view sheet or clone). */
export const QUOTATION_FORM_LOCKED_STATUSES: readonly QuotationStatus[] = [
  "approved",
  "converted_to_project",
  "rejected",
  "withdrawn",
];

export function isQuotationFormLocked(status: QuotationStatus): boolean {
  return (QUOTATION_FORM_LOCKED_STATUSES as readonly string[]).includes(status);
}

export function formatQuotationStatusLabel(status: QuotationStatus | string): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "sent":
      return "Sent";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "withdrawn":
      return "Withdrawn";
    case "converted_to_project":
      return "Converted to project";
    default:
      return String(status);
  }
}

export function quotationStatusBadgeClass(status: QuotationStatus | string): string {
  switch (status) {
    case "draft":
      return "bg-warning/10 text-warning";
    case "sent":
      return "bg-primary/10 text-primary";
    case "approved":
      return "bg-primary/10 text-primary";
    case "converted_to_project":
      return "bg-success/10 text-success";
    case "rejected":
      return "bg-destructive/10 text-destructive";
    case "withdrawn":
      return "bg-zinc-500/10 text-zinc-600";
    default:
      return "bg-muted text-muted-foreground";
  }
}
