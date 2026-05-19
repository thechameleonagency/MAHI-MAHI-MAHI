import { Skeleton } from "@/components/ui/skeleton";

export function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-24 rounded-xl border border-border/40" />
        <Skeleton className="h-24 rounded-xl border border-border/40" />
        <Skeleton className="h-24 rounded-xl border border-border/40" />
      </div>
      <Skeleton className="h-12 w-full max-w-md rounded-md" />
      <Skeleton className="h-48 w-full rounded-xl border border-border/40" />
      <Skeleton className="h-64 w-full rounded-xl border border-border/40" />
    </div>
  );
}
