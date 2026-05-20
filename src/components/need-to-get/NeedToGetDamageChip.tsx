import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type NeedToGetDamageChipProps = {
  damageQty?: number;
  className?: string;
};

/** Shortfall widened because reported damage reduced warehouse stock for this SKU. */
export function NeedToGetDamageChip({ damageQty, className }: NeedToGetDamageChipProps) {
  const qty = damageQty ?? 0;
  const label = qty > 0 ? `incl. damaged (${qty})` : "incl. damaged";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "w-fit cursor-default border-amber-300/80 bg-amber-50 text-2xs font-normal text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/50 dark:text-amber-100",
            className,
          )}
        >
          {label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-left">
        Warehouse stock for this material was reduced by a damage report. The shortfall includes
        units written off{qty > 0 ? ` (${qty} qty)` : ""}.
      </TooltipContent>
    </Tooltip>
  );
}
