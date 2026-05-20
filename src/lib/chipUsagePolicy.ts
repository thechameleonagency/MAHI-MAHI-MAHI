/**
 * DS5 — StatusBadge vs AgingChip
 *
 * - **StatusBadge** — entity workflow/lifecycle state (`paid`, `pending`, `On Hold`, `draft`).
 *   One badge per state column; colors from `statusColors.ts`.
 * - **AgingChip** — time-based urgency from dates (`Overdue 15d`, `Idle 5d`, `Draft 12d stale`).
 *   Do not repeat the StatusBadge label (e.g. no AgingChip `"On hold"` when status is already On Hold).
 *
 * Rows may show both when duration adds information: StatusBadge for state + AgingChip for how long.
 */

export const STATUS_BADGE_COMPONENT = "StatusBadge";
export const AGING_CHIP_COMPONENT = "AgingChip";
