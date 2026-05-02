import { useMemo } from "react";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/lib/tableConstants";

/** Maps filtered lists to the current page slice with safe clamped page index. */
export function usePagedSlice<T>(
  items: readonly T[],
  page: number,
  pageSize: number = DEFAULT_TABLE_PAGE_SIZE,
) {
  return useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize) || 1);
    const safePage = Math.min(Math.max(1, page), totalPages);
    const pagedItems = items.slice((safePage - 1) * pageSize, safePage * pageSize);
    return { pagedItems, safePage, totalPages };
  }, [items, page, pageSize]);
}
