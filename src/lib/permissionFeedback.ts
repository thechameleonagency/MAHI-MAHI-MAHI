import { toast } from "@/hooks/use-toast";
import type { AppAction } from "@/domain/policies/permissionMatrix";
import { ROLE_LABELS, type UserRole } from "@/domain/entities/identity";
import { PERMISSION_DENIED_HINTS } from "@/lib/permissionDeniedHints";
import { routeAccessDeniedToastContent } from "@/lib/routeAccessDenied";

/** Neutral title for role-matrix denials (T1 — not a system error). */
export const PERMISSION_DENIED_TOAST_TITLE = "Not available for your role";

const APP_ACTION_HINTS: Partial<Record<AppAction, string>> = {
  "enquiry:create": "Your role cannot create enquiries.",
  "customer:create": "Your role cannot add new customers.",
  "quotation:create": PERMISSION_DENIED_HINTS.enquiryCreateQuotation,
  "quotation:confirm": PERMISSION_DENIED_HINTS.quotationApprove,
  "project:create_from_quote": PERMISSION_DENIED_HINTS.projectFromQuote,
  "project:create_direct_exception": "Only admin, management, or CEO can create a direct project exception.",
  "project:update_commercial": "Your role cannot update commercial project details.",
  "project:update_execution": "Your role cannot update project execution details.",
  "inventory:material_movement": "Your role cannot record inventory movements.",
  "finance:create_invoice": PERMISSION_DENIED_HINTS.invoiceCreate,
  "finance:record_payment": "Your role cannot record client payments.",
  "finance:update_payment": "Your role cannot edit payments.",
  "finance:delete_payment": "Your role cannot delete payments.",
  "finance:record_expense_income": "Your role cannot record expenses or income.",
  "finance:update_expense": "Your role cannot edit expenses.",
  "finance:delete_expense": "Your role cannot delete expenses.",
  "finance:update_income": "Your role cannot edit income entries.",
  "finance:delete_income": "Your role cannot delete income entries.",
  "partner:update": "Your role cannot update partners.",
  "partner:delete": "Your role cannot delete partners.",
  "partner:add_transaction": "Your role cannot add partner transactions.",
  "loan:update": "Your role cannot update loans.",
  "loan:delete": "Your role cannot delete loans.",
  "loan:add_repayment": "Your role cannot record loan repayments.",
  "vendor:record_bill": "Your role cannot record vendor bills.",
  "vendor:record_payment": "Your role cannot record vendor payments.",
  "vendor:update_payment": "Your role cannot edit vendor payments.",
  "vendor:delete_payment": "Your role cannot delete vendor payments.",
  "hr:release_payroll": "Your role cannot record payroll.",
  "hr:record_wallet": "Your role cannot update employee wallets.",
  "hr:mark_holiday": "Your role cannot mark holidays.",
  "hr:update_employee": "Your role cannot update employee records.",
  "approval:resolve": PERMISSION_DENIED_HINTS.expenseReimbursementApprove,
};

/** User-facing description for a denied {@link AppAction}. */
export function permissionDeniedDescriptionForAction(
  action: AppAction,
  role?: UserRole,
): string {
  const hint = APP_ACTION_HINTS[action];
  if (hint) return hint;
  const roleLabel = role ? (ROLE_LABELS[role] ?? role) : "Your role";
  const [, verbPart] = action.split(":");
  const verb = (verbPart ?? action).replace(/_/g, " ");
  return `${roleLabel} cannot ${verb}.`;
}

export function permissionDeniedToastContent(
  description: string,
  title: string = PERMISSION_DENIED_TOAST_TITLE,
): { title: string; description: string } {
  return { title, description };
}

/** Role denial toast — default (non-destructive) styling (T1). */
export function showPermissionDeniedToast(
  description: string,
  title: string = PERMISSION_DENIED_TOAST_TITLE,
): void {
  const { title: t, description: d } = permissionDeniedToastContent(description, title);
  toast({ title: t, description: d });
}

export function showPermissionDeniedToastForAction(action: AppAction, role?: UserRole): void {
  showPermissionDeniedToast(permissionDeniedDescriptionForAction(action, role));
}

/** Route access denial after redirect (M6 / T1). */
export function showRouteAccessDeniedToast(deniedPath: string, role: UserRole): void {
  const { title, description } = routeAccessDeniedToastContent(deniedPath, role);
  toast({ title, description });
}
