import type { AppSheetLayoutMode, AppSheetSize } from "@/components/shared/AppSheetLayout";

/**
 * Canonical sheet size + layout pairs (DS1 / M10).
 * Use `preset` on `AppSheetContent` or spread into `size` / `layout` — never ad-hoc width classes.
 */
export type AppSheetPresetProps = {
  size: AppSheetSize;
  layout: AppSheetLayoutMode;
};

export const APP_SHEET_PRESETS = {
  /** Destructive / binary confirms (withdraw, void, small ack). */
  confirm: { size: "xs", layout: "form" },
  /** Compact pickers (entity info, expense type, need-to-get sub-forms). */
  narrowForm: { size: "sm", layout: "form" },
  /** Default create/edit forms (enquiry, vendor bill, site visit). */
  standardForm: { size: "md", layout: "form" },
  /** Multi-section forms with lists/grids (team roster, attendance sites, schedule install). */
  wideForm: { size: "lg", layout: "form" },
  /** Invoice create, wide finance line items. */
  financeForm: { size: "xxl", layout: "form" },
  /** Entity detail, tables-in-sheet, dashboard drill-downs. */
  detail: { size: "xl", layout: "scroll" },
  /** Bank recon, need-to-get main panel, print-friendly wide docs. */
  document: { size: "wide", layout: "document" },
  /** Image / media preview — bare chrome, lg cap (no width override). */
  mediaViewer: { size: "lg", layout: "bare" },
  /** Mobile command palette (cmdk). */
  commandPalette: { size: "lg", layout: "scroll" },
} as const satisfies Record<string, AppSheetPresetProps>;

export type AppSheetPresetKey = keyof typeof APP_SHEET_PRESETS;

export function appSheetPreset(key: AppSheetPresetKey): AppSheetPresetProps {
  return APP_SHEET_PRESETS[key];
}

/** Form layouts must not use detail-width tokens (xl/xxl/wide) except finance. */
export function isAllowedFormSheetSize(size: AppSheetSize): boolean {
  return size === "xs" || size === "sm" || size === "md" || size === "lg" || size === "xxl";
}

export function isFormSheetSizeViolation(size: AppSheetSize, layout: AppSheetLayoutMode): boolean {
  if (layout !== "form") return false;
  if (size === "xxl") return false;
  return size === "xl" || size === "wide";
}
