import { useMemo } from "react";
import { useCan } from "@/hooks/useCan";

/**
 * Per-module visibility inside Finance Hub (`/finance`).
 * Route access uses `financeHub.view`; each panel respects its own feature `view`.
 */
export function useFinanceHubPanels() {
  const canViewPayments = useCan("payment", "view");
  const canViewExpenses = useCan("expense", "view");
  const canViewIncome = useCan("income", "view");
  const canViewInvoices = useCan("invoice", "view");
  const canViewSaleBills = useCan("saleBill", "view");
  const canViewVendorAp = useCan("vendorBill", "view");

  const canViewReceivables = canViewInvoices || canViewSaleBills;

  const hasAnyPanel = useMemo(
    () =>
      canViewPayments ||
      canViewExpenses ||
      canViewIncome ||
      canViewReceivables ||
      canViewVendorAp,
    [canViewPayments, canViewExpenses, canViewIncome, canViewReceivables, canViewVendorAp],
  );

  return {
    canViewPayments,
    canViewExpenses,
    canViewIncome,
    canViewInvoices,
    canViewSaleBills,
    canViewReceivables,
    canViewVendorAp,
    hasAnyPanel,
  };
}
