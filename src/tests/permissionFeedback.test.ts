import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AppAction } from "@/domain/policies/permissionMatrix";
import {
  PERMISSION_DENIED_TOAST_TITLE,
  permissionDeniedDescriptionForAction,
  permissionDeniedToastContent,
  showPermissionDeniedToast,
  showPermissionDeniedToastForAction,
  showRouteAccessDeniedToast,
} from "@/lib/permissionFeedback";
import { toast } from "@/hooks/use-toast";

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("permissionFeedback (T1)", () => {
  beforeEach(() => {
    vi.mocked(toast).mockClear();
  });

  it("uses a neutral title, not Action not permitted", () => {
    expect(PERMISSION_DENIED_TOAST_TITLE).not.toMatch(/action not permitted/i);
    const content = permissionDeniedToastContent("Your role cannot delete customers.");
    expect(content.title).toBe(PERMISSION_DENIED_TOAST_TITLE);
  });

  it("maps known actions to friendly hints without raw action keys", () => {
    const desc = permissionDeniedDescriptionForAction("quotation:confirm", "salesperson");
    expect(desc).toContain("admin");
    expect(desc).not.toContain("quotation:confirm");
  });

  it("showPermissionDeniedToast omits destructive variant", () => {
    showPermissionDeniedToast("Your role cannot create templates.");
    expect(toast).toHaveBeenCalledWith({
      title: PERMISSION_DENIED_TOAST_TITLE,
      description: "Your role cannot create templates.",
    });
    expect(toast.mock.calls[0][0]).not.toHaveProperty("variant", "destructive");
  });

  it("showPermissionDeniedToastForAction uses payroll hint for hr:release_payroll", () => {
    showPermissionDeniedToastForAction("hr:release_payroll", "salesperson");
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringMatching(/payroll/i),
      }),
    );
  });

  it("showRouteAccessDeniedToast omits destructive variant", () => {
    showRouteAccessDeniedToast("/audit", "salesperson");
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringMatching(/don't have access/i),
        description: expect.stringContaining("/audit"),
      }),
    );
    expect(toast.mock.calls[0][0]).not.toHaveProperty("variant", "destructive");
  });

  it("covers every AppAction with a non-empty description", () => {
    const actions: AppAction[] = [
      "enquiry:create",
      "customer:create",
      "quotation:create",
      "quotation:confirm",
      "project:create_from_quote",
      "project:create_direct_exception",
      "project:update_commercial",
      "project:update_execution",
      "inventory:material_movement",
      "finance:create_invoice",
      "finance:record_payment",
      "finance:update_payment",
      "finance:delete_payment",
      "finance:record_expense_income",
      "finance:update_expense",
      "finance:delete_expense",
      "finance:update_income",
      "finance:delete_income",
      "partner:update",
      "partner:delete",
      "partner:add_transaction",
      "loan:update",
      "loan:delete",
      "loan:add_repayment",
      "vendor:record_bill",
      "vendor:record_payment",
      "vendor:update_payment",
      "vendor:delete_payment",
      "hr:release_payroll",
      "hr:record_wallet",
      "hr:mark_holiday",
      "hr:update_employee",
      "approval:resolve",
    ];
    for (const action of actions) {
      const desc = permissionDeniedDescriptionForAction(action, "salesperson");
      expect(desc.length).toBeGreaterThan(10);
      expect(desc).not.toContain(`${action}`);
    }
  });
});
