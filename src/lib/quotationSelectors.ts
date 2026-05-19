import type { Quotation } from "@/types/project";

export function isQuotationConverted(q: Pick<Quotation, "status" | "linkedProjectId">): boolean {
  if (q.status === "converted_to_project") return true;
  return Boolean(q.linkedProjectId?.trim());
}

/** Canonical project link for a quotation (prefer linkedProjectId). */
export function quotationLinkedProjectId(
  q: Pick<Quotation, "linkedProjectId" | "convertedToProjectId">,
): string | undefined {
  const id = q.linkedProjectId?.trim() || q.convertedToProjectId?.trim();
  return id || undefined;
}
