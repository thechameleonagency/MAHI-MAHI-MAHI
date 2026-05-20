/**
 * DS10 — Tooltip vs Popover
 *
 * - **Tooltip** — one short phrase on hover/focus (≤ `TOOLTIP_MAX_CHARS` chars). No paragraphs,
 *   no multi-step copy, no constants meant for help panels.
 * - **Popover** — richer explanations, multiple lines, or interactive pickers.
 *
 * Page header pin: `PageHeaderPinControls` — tooltip on the pin button, popover on the help icon.
 */

export const TOOLTIP_MAX_CHARS = 120;

export const PAGE_HEADER_PIN_CONTROLS_COMPONENT = "PageHeaderPinControls";
