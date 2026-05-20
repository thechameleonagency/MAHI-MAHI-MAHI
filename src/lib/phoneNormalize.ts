/** Strip non-digits for phone comparison (+91, spaces, dashes). */
export function normalizePhoneDigits(phone: string | undefined | null): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}
