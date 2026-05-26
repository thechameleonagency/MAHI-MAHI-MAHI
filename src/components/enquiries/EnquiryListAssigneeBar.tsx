import { useEffect, useRef, type ReactNode } from "react";
import { Plus, Search, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EnquiryAssignableMember } from "@/lib/enquiryAssignee";
import { cn } from "@/lib/utils";

export const enquiryHeaderPanelClass =
  "min-w-0 rounded-lg border border-border/50 bg-muted/30";

/** Same height on left filter row and right search row so border-t lines align. */
export const enquiryHeaderTopRowClass =
  "flex h-12 min-h-12 shrink-0 items-center overflow-x-auto overflow-y-hidden px-3 py-1";

export const enquiryHeaderTopRowScrollStyle = { scrollbarGutter: "stable" as const };

export const enquiryHeaderBottomRowClass =
  "flex min-h-[2.75rem] flex-1 flex-col border-t border-primary/15 bg-primary/5";

/** Left-aligned active marker (max 28px) for filter chips. */
export function FilterChipActiveIndicator({ active }: { active?: boolean }) {
  if (!active) return null;
  return (
    <span
      className="pointer-events-none absolute bottom-0 left-0 h-0.5 w-7 max-w-[28px] rounded-full bg-foreground"
      aria-hidden
    />
  );
}

type EnquiryListAssigneeBarProps = {
  members: EnquiryAssignableMember[];
  selectedIds: string[];
  onToggle: (memberId: string) => void;
  onClear: () => void;
  onClearAllFilters?: () => void;
  showClearAllFilters?: boolean;
};

/** Horizontal assignee multi-select row — slides open below the enquiry filter strip. */
export function EnquiryListAssigneeBar({
  members,
  selectedIds,
  onClear,
  onToggle,
  onClearAllFilters,
  showClearAllFilters = false,
}: EnquiryListAssigneeBarProps) {
  return (
    <div
      className="flex min-w-0 flex-row items-center gap-3 px-3 py-2"
      role="region"
      aria-label="Filter by assignee"
    >
      <p className="shrink-0 text-xs text-foreground whitespace-nowrap">
        <span className="font-medium">Filter by assignee</span>
        <span className="text-muted-foreground">
          {selectedIds.length > 0 ? ` · ${selectedIds.length} selected` : " · select one or more"}
        </span>
      </p>
      <div
        className="flex min-w-0 flex-1 flex-row flex-nowrap items-center gap-2 overflow-x-auto py-1"
        style={enquiryHeaderTopRowScrollStyle}
      >
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-border/60 bg-background/90 px-2 py-1 text-xs whitespace-nowrap">
          <Checkbox checked={selectedIds.length === 0} onCheckedChange={() => onClear()} />
          <span>All</span>
        </label>
        <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-border/60 bg-background/90 px-2 py-1 text-xs whitespace-nowrap">
          <Checkbox
            checked={selectedIds.includes("__unassigned__")}
            onCheckedChange={() => onToggle("__unassigned__")}
          />
          <span>Unassigned</span>
        </label>
        {members.map((m) => (
          <label
            key={m.id}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-border/60 bg-background/90 px-2 py-1 text-xs whitespace-nowrap"
          >
            <Checkbox checked={selectedIds.includes(m.id)} onCheckedChange={() => onToggle(m.id)} />
            <span>{m.name}</span>
          </label>
        ))}
        {members.length === 0 && (
          <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
            No salespeople in Settings → Team or Employees.
          </span>
        )}
      </div>
      {selectedIds.length > 0 && (
        <Button type="button" variant="link" size="sm" className="h-auto shrink-0 px-0 text-xs" onClick={onClear}>
          Clear
        </Button>
      )}
      {onClearAllFilters ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="ml-auto h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          onClick={onClearAllFilters}
          disabled={!showClearAllFilters}
          aria-label="Clear all filters"
          title="Clear all filters"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}

type EnquiryFilterStripProps = {
  assigneePanelOpen: boolean;
  assigneeSelectedCount: number;
  onToggleAssigneePanel: () => void;
  assigneeBar: ReactNode;
  children: ReactNode;
  className?: string;
};

/** KPI filter strip with assignee toggle integrated and slide-down assignee row. */
export function EnquiryFilterStrip({
  assigneePanelOpen,
  assigneeSelectedCount,
  onToggleAssigneePanel,
  assigneeBar,
  children,
  className,
}: EnquiryFilterStripProps) {
  const assignedActive = assigneePanelOpen || assigneeSelectedCount > 0;

  return (
    <div
      className={cn(
        enquiryHeaderPanelClass,
        "grid min-h-0 flex-1 grid-rows-[3rem_1fr]",
        className,
      )}
    >
      <div
        className={cn(
          enquiryHeaderTopRowClass,
          "flex-nowrap gap-x-4 gap-y-1.5 sm:gap-x-6",
        )}
        style={enquiryHeaderTopRowScrollStyle}
      >
        <button
          type="button"
          onClick={onToggleAssigneePanel}
          className="relative min-w-0 shrink-0 pb-1 text-left transition-colors hover:opacity-80"
          aria-expanded={assigneePanelOpen}
          aria-label="Filter by assignee"
          aria-pressed={assignedActive}
        >
          <span className="block text-2xs font-semibold uppercase tracking-wide text-muted-foreground leading-tight">
            Assigned
          </span>
          <span className="block text-sm font-bold tabular-nums leading-tight text-foreground">
            {assigneeSelectedCount > 0 ? assigneeSelectedCount : "All"}
          </span>
          <FilterChipActiveIndicator active={assignedActive} />
        </button>
        {children}
      </div>
      <div className={cn(enquiryHeaderBottomRowClass, "min-h-0 overflow-hidden")}>
        <div
          className={cn(
            "grid min-h-0 flex-1 transition-[grid-template-rows,opacity] duration-200 ease-out",
            assigneePanelOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="flex min-h-0 flex-col justify-center overflow-hidden">{assigneeBar}</div>
        </div>
      </div>
    </div>
  );
}

type EnquiryHeaderActionsPanelProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onAddEnquiry: () => void;
  addDisabled?: boolean;
  className?: string;
  searchExpanded?: boolean;
  onSearchExpand?: () => void;
  onSearchCollapse?: () => void;
};

/** Right header panel: search on top, add enquiry below (mirrors filter strip layout). */
export function EnquiryHeaderActionsPanel({
  searchQuery,
  onSearchChange,
  onAddEnquiry,
  addDisabled = false,
  className,
  searchExpanded = false,
  onSearchExpand,
  onSearchCollapse,
}: EnquiryHeaderActionsPanelProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchExpanded) {
      searchInputRef.current?.focus();
    }
  }, [searchExpanded]);

  useEffect(() => {
    if (!searchExpanded || !onSearchCollapse) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSearchCollapse();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchExpanded, onSearchCollapse]);

  const showFullSearchRow = searchExpanded;

  return (
    <div
      className={cn(
        enquiryHeaderPanelClass,
        "grid min-h-0 shrink-0 grid-rows-[3rem_1fr]",
        className,
      )}
    >
      <div
        className={cn(enquiryHeaderTopRowClass, "justify-center")}
        style={enquiryHeaderTopRowScrollStyle}
      >
        {showFullSearchRow ? (
          <div className="relative flex w-full min-w-0 items-center gap-1">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search name, phone, or ID"
                className="h-8 w-full border-border bg-muted/50 pl-8 pr-8 text-sm"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            {onSearchCollapse ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={onSearchCollapse}
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="relative hidden w-full min-w-0 lg:block">
              <Search className="absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, phone, or ID"
                className="h-8 w-full border-border bg-muted/50 pl-8 text-sm"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 lg:hidden"
              onClick={onSearchExpand}
              aria-label="Search enquiries"
            >
              <Search className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
      <div
        className={cn(
          enquiryHeaderBottomRowClass,
          "items-center justify-center px-3 py-2",
        )}
      >
        <Button
          className="hidden h-9 w-full px-3 lg:inline-flex"
          onClick={onAddEnquiry}
          disabled={addDisabled}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add enquiry
        </Button>
        <Button
          type="button"
          variant="default"
          size="icon"
          className="h-9 w-9 lg:hidden"
          onClick={onAddEnquiry}
          disabled={addDisabled}
          aria-label="Add enquiry"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
