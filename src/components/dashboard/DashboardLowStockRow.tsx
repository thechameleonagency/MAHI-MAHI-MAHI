import { Link } from "react-router-dom";
import { ExternalLink, Package } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-3 space-y-2">
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
        </div>
        <Button size="sm" variant="ghost" className="shrink-0 h-8" asChild>
          <Link to="/inventory/materials">
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
      <Button size="sm" variant="outline" className="h-7 text-xs" asChild>
        <Link to="/inventory/materials">
          <Package className="mr-1 h-3 w-3" />
          Open materials
        </Link>
      </Button>
    </div>
  );
}
