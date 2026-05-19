/**
 * Toast vs inline-banner feedback policy (prototype).
 *
 * **Toast** — ephemeral, global (top-right). Use for:
 * - Field / form validation errors (`variant: "destructive"`)
 * - Quick list-row or modal actions (status chip, share, PDF export, delete confirm result)
 * - Errors when the user stays on the same view
 *
 * **InlineConfirmBanner** — page-scoped, persists until dismissed. Use for:
 * - Primary save/update on heavy forms (e.g. Quotations create/list save, clone, revise)
 * - Success that should remain visible while the user stays on that page tab
 *
 * Do **not** fire both for the same user action. When showing a toast after a prior
 * banner, clear the banner first (`setLastConfirm(null)`).
 */
export const TOAST_DURATION_MS = {
  default: 4_000,
  destructive: 8_000,
} as const;

/** DOM cleanup delay after dismiss animation (not visible duration). */
export const TOAST_REMOVE_DELAY_MS = 1_000;

export function getToastDurationMs(variant?: "default" | "destructive" | null): number {
  return variant === "destructive" ? TOAST_DURATION_MS.destructive : TOAST_DURATION_MS.default;
}
