import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  FINANCE_LINE_ITEM_FIELD_GRID,
  FINANCE_LINE_ITEM_ROW_SHELL,
} from "@/lib/financeLineItemLayout";

interface FinanceLineItemRowProps {
  children: ReactNode;
  className?: string;
}

/** Card stack below `md`; 12-column grid from `md` up (no horizontal scroll). */
export function FinanceLineItemRow({ children, className }: FinanceLineItemRowProps) {
  return (
    <div className={cn(FINANCE_LINE_ITEM_ROW_SHELL, className)}>
      <div className={FINANCE_LINE_ITEM_FIELD_GRID}>{children}</div>
    </div>
  );
}
