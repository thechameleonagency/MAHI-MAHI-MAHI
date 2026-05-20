/** DS3 — primary CTA labels on create/edit forms and sheets. */
export type FormActionMode = "create" | "edit";

export const FORM_SAVE_LABEL = "Save" as const;
export const FORM_CREATE_LABEL = "Create" as const;
/** DS8 — bottom-left dismiss on form sheets (pairs with top-right X). */
export const FORM_SHEET_CANCEL_LABEL = "Cancel" as const;

/** Primary footer button: `Create` (+ optional entity) or `Save`. */
export function formPrimaryLabel(mode: FormActionMode, entity?: string): string {
  if (mode === "edit") return FORM_SAVE_LABEL;
  if (!entity) return FORM_CREATE_LABEL;
  const trimmed = entity.trim();
  if (!trimmed) return FORM_CREATE_LABEL;
  return `${FORM_CREATE_LABEL} ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}`;
}

/** Labels that must not appear on primary form CTAs (use formPrimaryLabel). */
export const LEGACY_FORM_PRIMARY_LABELS = [
  "Save Changes",
  "Update Partner",
  "Update Team",
  "Confirm & Save",
  "Confirm &amp; Save",
  "Save Partner",
  "Add Agent",
  "Add Company",
  "Add Customer",
  "Add Enquiry",
  "Add Employee",
  "Add Tool",
  "Add Loan",
  "Add Item",
] as const;
