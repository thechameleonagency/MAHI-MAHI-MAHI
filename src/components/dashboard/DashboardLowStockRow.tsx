import { Package } from "lucide-react";
import { AgingChip } from "@/components/ui/AgingChip";
import { getLowStockAging } from "@/lib/agingHelpers";
import {
  DashboardCompactRowMenu,
  DashboardCompactRowMenuLink,
} from "@/components/dashboard/DashboardCompactRowMenu";

export interface DashboardLowStockRowProps {
  item: {
    id: number | string;
    name: string;
    stock: number;
    min: number;
    category?: string;
    unit?: string;
  };
}

export function DashboardLowStockRow({ item }: DashboardLowStockRowProps) {
  const shortBy = Math.max(0, (item.min || 0) - (item.stock || 0));
  const aging = getLowStockAging(item.stock, item.min);

  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-medium leading-tight">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            Stock <span className="font-semibold text-destructive">{item.stock}</span>
            {item.unit ? ` ${item.unit}` : ""} · min {item.min}
            {shortBy > 0 && (
              <>
                {" "}
                · short by <span className="font-semibold">{shortBy}</span>
              </>
            )}
          </p>
          <AgingChip signal={aging} />
        </div>
        <DashboardCompactRowMenu>
          <DashboardCompactRowMenuLink to="/inventory/materials" icon={Package}>
            Open materials
          </DashboardCompactRowMenuLink>
        </DashboardCompactRowMenu>
      </div>
    </div>
  );
}
