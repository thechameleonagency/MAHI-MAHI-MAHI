import type { Quotation } from "@/types/project";

type QuotationLinkFields = Pick<Quotation, "linkedProjectId" | "convertedToProjectId" | "status">;

/** Canonical project id for a quotation (`linkedProjectId`; reads legacy field only before migrate). */
export function quotationLinkedProjectId(q: QuotationLinkFields): string | undefined {
  const id = q.linkedProjectId?.trim() || q.convertedToProjectId?.trim();
  return id || undefined;
}

export function isQuotationConverted(q: QuotationLinkFields): boolean {
  if (q.status === "converted_to_project") return true;
  return Boolean(quotationLinkedProjectId(q));
}

/**
 * One-shot per quotation: copy `convertedToProjectId` → `linkedProjectId` and omit legacy field.
 * Idempotent — safe on every hydrate.
 */
export function migrateQuotationProjectLink(q: Quotation): Quotation {
  const linked = quotationLinkedProjectId(q);
  const { convertedToProjectId: _legacy, ...rest } = q;
  if (!linked) {
    return rest as Quotation;
  }
  return { ...(rest as Quotation), linkedProjectId: linked };
}

export function migrateQuotationsProjectLinks(quotations: Quotation[]): Quotation[] {
  return quotations.map(migrateQuotationProjectLink);
}

/** Repository/UI write when a quotation is converted to a project. */
export function buildQuotationProjectLinkPatch(projectId: string): Pick<
  Quotation,
  "status" | "linkedProjectId" | "convertedAt" | "convertedToProjectId"
> {
  return {
    status: "converted_to_project",
    linkedProjectId: projectId,
    convertedAt: new Date().toISOString().split("T")[0],
    convertedToProjectId: undefined,
  };
}
