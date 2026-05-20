/** Short labels for the top-bar page-header pin control (Mn4). */
export function pageHeaderPinTooltip(pinned: boolean): string {
  return pinned ? "Unpin header" : "Pin header to top";
}

export function pageHeaderPinAriaLabel(pinned: boolean): string {
  return pinned ? "Unpin page header" : "Pin page header to top";
}

/** Longer copy for the optional help popover beside the pin button. */
export const PAGE_HEADER_PIN_HELP =
  "When pinned, the page title and actions stay fixed under the top bar while you scroll. When unpinned, the page header scrolls away with the rest of the content.";
