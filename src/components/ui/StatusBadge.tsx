/** Entity workflow/lifecycle state (paid, On Hold, draft). Pair with AgingChip for duration, not duplicate state text. */
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getStatusColor } from "@/lib/statusColors";

type StatusBadgeProps = {
  status: string;
  /** When set, shown instead of raw `status` (e.g. human labels for enquiry states). */
  label?: string;
  className?: string;
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn("border-0 capitalize", getStatusColor(status), className)}>
      {label ?? status}
    </Badge>
  );
}
