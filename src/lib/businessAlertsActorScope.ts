import type { BusinessAlertDescriptor } from "@/lib/businessAlerts";
import type { Invoice } from "@/types/finance";
import type { Blockage } from "@/types/blockage";
import type { Project, Quotation } from "@/types/project";
import {
  filterProjectsForActor,
  filterQuotationsForActor,
  roleHasFullProjectAccess,
  type ProjectActorScopeContext,
} from "@/lib/projectActorScope";

const ADMIN_ALERT_KINDS = new Set<BusinessAlertDescriptor["kind"]>([
  "deletion_request",
  "vendor_bill",
  "loan",
]);

function projectIdFromDescriptor(
  d: BusinessAlertDescriptor,
  blockages: Blockage[],
): string | undefined {
  if (d.kind === "blockage" || d.kind === "blockage_stale") {
    const id = d.id.replace(/^blk-(?:young-)?/, "");
    return blockages.find((b) => b.id === id)?.projectId;
  }
  if (d.href.startsWith("/projects/")) {
    const match = d.href.match(/^\/projects\/([^/?]+)/);
    return match?.[1];
  }
  return undefined;
}

function quotationIdFromDescriptor(d: BusinessAlertDescriptor): string | undefined {
  if (d.kind !== "quotation") return undefined;
  return d.id.replace(/^quo-/, "");
}

function invoiceIdFromDescriptor(d: BusinessAlertDescriptor): string | undefined {
  if (d.kind !== "invoice") return undefined;
  return d.id.replace(/^inv-/, "");
}

/**
 * EC2 — hide alerts the current actor cannot act on after an in-session role switch.
 * Full-access roles see finance/admin alerts; field roles only see scoped pipeline/ops items.
 */
export function filterBusinessAlertsForActorScope(
  descriptors: readonly BusinessAlertDescriptor[],
  ctx: ProjectActorScopeContext,
  data: {
    projects: Project[];
    quotations: Quotation[];
    invoices: Invoice[];
    blockages: Blockage[];
  },
): BusinessAlertDescriptor[] {
  if (roleHasFullProjectAccess(ctx.role)) return [...descriptors];

  const visibleProjects = filterProjectsForActor(data.projects, ctx);
  const visibleProjectIds = new Set(visibleProjects.map((p) => p.id));
  const visibleQuotationIds = new Set(
    filterQuotationsForActor(data.quotations, ctx).map((q) => q.id),
  );
  const visibleCustomerIds = new Set(
    visibleProjects.map((p) => p.customerId).filter((id): id is string => Boolean(id?.trim())),
  );

  return descriptors.filter((d) => {
    if (ADMIN_ALERT_KINDS.has(d.kind)) return false;

    const projectId = projectIdFromDescriptor(d, data.blockages);
    if (projectId) return visibleProjectIds.has(projectId);

    const quotationId = quotationIdFromDescriptor(d);
    if (quotationId) return visibleQuotationIds.has(quotationId);

    const invoiceId = invoiceIdFromDescriptor(d);
    if (invoiceId) {
      const inv = data.invoices.find((i) => i.id === invoiceId);
      if (!inv) return false;
      if (inv.projectId && visibleProjectIds.has(inv.projectId)) return true;
      if (inv.customerId && visibleCustomerIds.has(inv.customerId)) return true;
      return false;
    }

    if (d.kind === "stock") return ctx.role !== "installation_team";

    return false;
  });
}
