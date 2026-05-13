export const TABLE_PAGE_SIZE_OPTIONS = [12, 24, 48, 100] as const;
export const DEFAULT_TABLE_PAGE_SIZE = 24;
export const TABLE_ROW_PX = 52;
export const TABLE_HEADER_PX = 48;
/** Sticky totals row (`<tfoot>`) inside scroll region */
export const TABLE_FOOTER_PX = 48;
/** Approximate pagination bar height (below scroll; always visible). */
export const TABLE_PAGINATION_BAR_PX = 54;
export const VISIBLE_ROW_TARGET = 13;

export const dataTableClasses = {
  scrollWrap: "w-full min-w-0 overflow-x-auto overscroll-x-contain",
  table: "w-full caption-bottom border-separate border-spacing-0 bg-white dark:bg-card text-sm",
  /** Apply to header `<TableRow>` */
  headRow:
    "sticky top-0 z-[12] bg-white shadow-[0_6px_10px_-6px_rgb(0_0_0/0.08)] backdrop-blur-[1px] dark:bg-card text-sm",
  /** Apply to totals `<TableRow>` in `<tfoot>` (sticky bottom of scroll viewport). */
  footRow:
    "sticky bottom-0 z-[11] border-t border-border bg-white shadow-[0_-8px_12px_-8px_rgb(0_0_0/0.08)] dark:bg-card font-medium text-sm",
} as const;

/**
 * Height cap for entire table shell (scroll area + totals + pagination strip).
 * Use as `style={{ maxHeight: listTableViewportMaxHeight(pageSize) }}` or pass to DataTableShell.maxHeight.
 */
export function listTableViewportMaxHeight(pageSize: number): string {
  // Force the table shell to never exceed the viewport minus top headers/nav.
  // This guarantees the page won't scroll, so the table's internal sticky header works.
  return `calc(100vh - 240px)`;
}

/** @deprecated Prefer listTableViewportMaxHeight — identical behavior (renamed). */
export const listTableBodyMaxHeight = listTableViewportMaxHeight;

export function tablePageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize) || 1);
}
