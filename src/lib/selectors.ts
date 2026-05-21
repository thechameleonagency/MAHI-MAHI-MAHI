import type { Project, Quotation } from "@/types/project";
import type { Customer } from "@/types/finance";

export type ProjectKind =
  | "SOLO_EPC"
  | "PARTNER_EPC"
  | "FIXED_EPC"
  | "VENDOR_NETWORK"
  | "INC"
  | "INC_GIVEN"
  | "OUTSOURCED_INC"
  | "VENDORSHIP_ONLY";

export function getProjectKind(project: Project | undefined | null): ProjectKind {
  return (project?.projectKind ?? "SOLO_EPC") as ProjectKind;
}

export function getProjectStatus(project: Project | undefined | null): string {
  return project?.lifecycleStatus ?? project?.status ?? "New";
}

export function getProjectPartners(project: Project | undefined | null) {
  return project?.partners ?? [];
}

export function getProjectAssignees(project: Project | undefined | null): number[] {
  return project?.assignees ?? [];
}

export function getProjectInvoiceIds(project: Project | undefined | null): string[] {
  return project?.invoiceIds ?? [];
}

export function getProjectMaterialsSent(project: Project | undefined | null) {
  return project?.materialsSent ?? [];
}

export function getProjectSiteChecklist(project: Project | undefined | null) {
  return project?.siteChecklist ?? [];
}

export function getProjectExecutionLineItems(project: Project | undefined | null) {
  return project?.executionLineItems ?? [];
}

export function getProjectAdditionalWorkLines(project: Project | undefined | null) {
  return (project as Project & { additionalWorkLines?: unknown[] })?.additionalWorkLines ?? [];
}

export function getCustomerKind(
  customer: Customer | undefined | null,
): "project" | "inventory" | "both" {
  const k = (customer as Customer & { customerKind?: string })?.customerKind;
  return (k === "inventory" || k === "both" || k === "project" ? k : "project");
}

export function isCustomerArchived(customer: Customer | undefined | null): boolean {
  return Boolean((customer as Customer & { archivedAt?: string | null })?.archivedAt);
}

export function safeArr<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

export function safeStr(value: string | undefined | null): string {
  return typeof value === "string" ? value : "";
}

export function safeNum(value: number | undefined | null): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/** Prefer FK on quotation; avoid name-based customer matching in dashboards. */
export function resolveQuotationCustomerId(
  quotation: Pick<Quotation, "customerId">,
): string | undefined {
  const id = quotation.customerId?.trim();
  return id ? id : undefined;
}
