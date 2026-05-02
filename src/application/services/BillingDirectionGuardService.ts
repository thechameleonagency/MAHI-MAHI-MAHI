import type { Project } from "@/types/project";
import type { BillingDirection } from "@/domain/projectTypes/types";

export class BillingDirectionGuardService {
  /**
   * MSS→customer operational billing (invoices / sale bills) is invariant: always allowed for any project kind.
   * Payment routing and channel economics are modeled separately (collections / income), not via blocking invoices.
   */
  canUseDirection(project: Project | undefined, direction: BillingDirection): { ok: boolean; error?: string } {
    if (direction === "company_to_customer") {
      return { ok: true };
    }

    if (!project) {
      return { ok: true };
    }

    const allowedDirections = project.projectKindConfigSnapshot?.allowedBillingDirections;
    if (!allowedDirections || allowedDirections.length === 0) {
      return { ok: true };
    }

    if (allowedDirections.includes(direction)) {
      return { ok: true };
    }

    return {
      ok: false,
      error: `Billing direction '${direction}' is not allowed for project kind ${project.projectKind || "UNKNOWN"}`,
    };
  }
}
