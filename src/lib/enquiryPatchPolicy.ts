import type { Enquiry } from "@/types/project";

/** Fields that must use dedicated commands / workflows — not generic enquiry.update. */
const FORBIDDEN_PATCH_KEYS = new Set([
  "id",
  "status",
  "createdAt",
  "customerId",
  "quotationId",
  "quotationIds",
]);

export function sanitizeEnquiryPatch(
  patch: Partial<Enquiry>,
): { ok: true; patch: Partial<Enquiry> } | { ok: false; message: string } {
  const blocked = Object.keys(patch).filter((k) => FORBIDDEN_PATCH_KEYS.has(k));
  if (blocked.length > 0) {
    return {
      ok: false,
      message: `Cannot update enquiry field(s) via edit: ${blocked.join(", ")}. Use the appropriate workflow command.`,
    };
  }
  if (Object.keys(patch).length === 0) {
    return { ok: false, message: "No enquiry changes to apply." };
  }
  return { ok: true, patch };
}
