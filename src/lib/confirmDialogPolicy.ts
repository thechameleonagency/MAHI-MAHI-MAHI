/**
 * DS4 — When to use which confirmation UI.
 *
 * - **DestructiveConfirmDialog** — delete, void, remove, or other irreversible/destructive actions.
 *   Replaces ad-hoc `<AlertDialog>` blocks with destructive styling and `window.confirm()`.
 * - **AlertDialog** (direct) — non-destructive confirmations only (approve quotation, proceed despite warning).
 * - **Sheet / Dialog** — multi-field confirmations (role change with context) where a full form layout is needed.
 */

export const DESTRUCTIVE_CONFIRM_COMPONENT = "DestructiveConfirmDialog";
