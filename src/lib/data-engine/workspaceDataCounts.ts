/** Core row counts used to verify canonical workspace data after generation. */
export interface WorkspaceDataCounts {
  projects: number;
  customers: number;
  enquiries: number;
  quotations: number;
  invoices: number;
  employees: number;
}

export function readWorkspaceDataCounts(source: {
  projects?: unknown[];
  customers?: unknown[];
  enquiries?: unknown[];
  quotations?: unknown[];
  invoices?: unknown[];
  employees?: unknown[];
}): WorkspaceDataCounts {
  return {
    projects: source.projects?.length ?? 0,
    customers: source.customers?.length ?? 0,
    enquiries: source.enquiries?.length ?? 0,
    quotations: source.quotations?.length ?? 0,
    invoices: source.invoices?.length ?? 0,
    employees: source.employees?.length ?? 0,
  };
}

export function isWorkspacePipelineSeeded(counts: WorkspaceDataCounts): boolean {
  return (
    counts.projects > 0 &&
    counts.customers > 0 &&
    counts.enquiries > 0 &&
    counts.quotations > 0
  );
}

export function formatWorkspaceDataCounts(counts: WorkspaceDataCounts): string {
  return `projects=${counts.projects}, customers=${counts.customers}, enquiries=${counts.enquiries}, quotations=${counts.quotations}, invoices=${counts.invoices}, employees=${counts.employees}`;
}
