import { resolveChangeRequestDeltaAmount } from "@/lib/changeRequestApproval";
import { buildChangeRequestDeltaInvoice } from "@/lib/changeRequestDeltaInvoice";
import type { Customer, Invoice } from "@/types/finance";
import type { ProjectChangeRequest } from "@/types/operations";
import type { Project } from "@/types/project";

export function mergeProjectInvoiceRef(
  project: Project,
  docId: string,
): Pick<Project, "invoiceIds" | "invoiceId"> {
  const ids = [...(project.invoiceIds ?? [])];
  if (!ids.includes(docId)) ids.unshift(docId);
  return { invoiceIds: ids, invoiceId: project.invoiceId ?? docId };
}

export type IssueChangeRequestDeltaBillingInput = {
  project: Project;
  customer?: Customer;
  changeRequest: ProjectChangeRequest;
  existingInvoices: Invoice[];
  invoiceId: string;
  issuedAt?: string;
};

export type IssueChangeRequestDeltaBillingResult = {
  invoice: Invoice;
  generatedInvoiceId: string;
  projectInvoicePatch: Pick<Project, "invoiceIds" | "invoiceId">;
};

/** Build a real pending invoice for an approved scope-change delta (live + seed + hydrate). */
export function issueChangeRequestDeltaBilling(
  input: IssueChangeRequestDeltaBillingInput,
): IssueChangeRequestDeltaBillingResult | null {
  const deltaAmount =
    resolveChangeRequestDeltaAmount(input.project, input.changeRequest) ||
    input.changeRequest.deltaAmount ||
    0;
  if (deltaAmount <= 0 || !input.project.customerId?.trim()) return null;

  const invoice = buildChangeRequestDeltaInvoice({
    project: input.project,
    customer: input.customer,
    changeRequest: input.changeRequest,
    deltaAmount,
    invoiceId: input.invoiceId,
    existingInvoices: input.existingInvoices,
    issuedAt: input.issuedAt,
  });

  return {
    invoice,
    generatedInvoiceId: invoice.id,
    projectInvoicePatch: mergeProjectInvoiceRef(input.project, invoice.id),
  };
}
