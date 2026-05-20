import type { Quotation } from "@/types/project";

export function isQuotationConverted(
  q: Pick<Quotation, "status" | "linkedProjectId" | "convertedToProjectId">,
): boolean {
  if (q.status === "converted_to_project") return true;
  if (q.linkedProjectId?.trim()) return true;
  return Boolean(q.convertedToProjectId?.trim());
}

/** Canonical project link for a quotation (prefer linkedProjectId). */
export function quotationLinkedProjectId(
  q: Pick<Quotation, "linkedProjectId" | "convertedToProjectId">,
): string | undefined {
  const id = q.linkedProjectId?.trim() || q.convertedToProjectId?.trim();
  return id || undefined;
}
