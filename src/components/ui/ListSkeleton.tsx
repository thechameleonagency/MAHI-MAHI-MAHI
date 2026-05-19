import { Skeleton } from "@/components/ui/skeleton";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type ListSkeletonProps = {
  variant?: "cards" | "table";
  count?: number;
  columns?: number;
  className?: string;
};

export function ListSkeleton({
  variant = "cards",
  count = 6,
  columns = 11,
  className,
}: ListSkeletonProps) {
  if (variant === "table") {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <TableRow key={i} className="border-border">
            {Array.from({ length: columns }).map((_, j) => (
              <TableCell key={j}>
                <Skeleton className="h-5 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </>
    );
  }

  return (
    <div
      className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}
      aria-busy="true"
      aria-label="Loading list"
    >
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-64 rounded-xl border border-border/40" />
      ))}
    </div>
  );
}
