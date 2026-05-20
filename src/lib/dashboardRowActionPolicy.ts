/**
 * DS6 — Dashboard row actions
 *
 * - **Compact drill-down rows** (`Dashboard*Row` in dashboard KPI sheets): one ⋮ menu via
 *   `DashboardCompactRowMenu`. Navigation and workflow actions belong in the menu — not a second
 *   inline button strip or duplicate ghost + footer CTA.
 * - **Detail / card surfaces** (full entity pages, `DashboardEmployeeCard`): inline buttons or
 *   whole-card click remain appropriate.
 */

export const DASHBOARD_COMPACT_ROW_MENU_COMPONENT = "DashboardCompactRowMenu";
