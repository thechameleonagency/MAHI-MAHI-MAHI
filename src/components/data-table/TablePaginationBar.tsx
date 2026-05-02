import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEFAULT_TABLE_PAGE_SIZE, TABLE_PAGE_SIZE_OPTIONS } from "@/lib/tableConstants";
import { cn } from "@/lib/utils";

type TablePaginationBarProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
};

export function TablePaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  className,
}: TablePaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);
  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 px-3 py-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <span className="tabular-nums">
        Showing {from}–{to} of {total}
        {" · "}
        <span className="text-foreground font-medium">
          Page {safePage} / {totalPages}
        </span>
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-xs uppercase tracking-wide">Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="h-9 w-[100px] border-border bg-white dark:bg-card" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {TABLE_PAGE_SIZE_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-1.5">
          <Button type="button" size="sm" variant="outline" disabled={!canPrev} onClick={() => onPageChange(safePage - 1)}>
            Previous
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={!canNext} onClick={() => onPageChange(safePage + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_TABLE_PAGE_SIZE };
