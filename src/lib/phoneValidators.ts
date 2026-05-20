/** Shared contact phone validation (V58) — prototype-friendly, not full libphonenumber. */

const PHONE_CHARS = /^[+0-9\s\-().]{7,24}$/;

export function validateContactPhone(raw: string): { ok: true } | { ok: false; message: string } {
  const s = raw.trim();
  if (!s) return { ok: true };
  if (!PHONE_CHARS.test(s)) {
    return { ok: false, message: "Use digits with optional +, spaces, dashes, or parentheses." };
  }
  const digits = s.replace(/\D/g, "");
  if (digits.length < 10) return { ok: false, message: "Enter at least 10 digits." };
  if (digits.length > 15) return { ok: false, message: "Phone number is too long." };
  return { ok: true };
}
