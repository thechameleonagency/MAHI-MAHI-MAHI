/**
 * Procurement handoff mode for field/installation roles that can view material
 * shortfalls but cannot record vendor bills (`vendor:record_bill`).
 *
 * When {@link isProcurementHandoffOnly} is true, the UI intentionally hides vendor
 * billing shortcuts and steers users to export the Need-to-Get report for procurement:
 *
 * **Materials page** (`Materials.tsx`)
 * - Need-to-Get card: shows a "Hand off to procurement" alert with link to open the report.
 * - Need-to-Get preview rows: hides inline "Bill · {vendor}" deep links to Vendor purchase entry.
 *
 * **Need-to-Get report sheet** (`NeedToGetSheet.tsx`)
 * - Top banner: same handoff alert (export-only; no vendor assignment in-sheet).
 * - Vendor column: shows read-only "Procurement" label instead of the vendor assign dropdown.
 *
 * Stock CRUD, issue/return, and opening the full report remain available; only vendor
 * assignment and purchase billing entry points are suppressed.
 */
export function isProcurementHandoffOnly(
  currentRole: string | null | undefined,
  canRecordVendorBill: boolean,
): boolean {
  return currentRole === "installation_team" && !canRecordVendorBill;
}
