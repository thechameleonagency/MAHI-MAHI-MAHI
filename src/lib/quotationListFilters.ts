import type { Quotation } from "@/types/project";

/** Draft or sent — matches dashboard "quotations in flight" KPI. */
export function isQuotationInFlight(q: Quotation): boolean {
  return q.status === "draft" || q.status === "sent";
}
