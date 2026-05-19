/** Standard 15-character Indian GSTIN format (PAN + entity + Z + checksum). */
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function isValidGstin(gstin: string): boolean {
  const g = gstin.trim().toUpperCase();
  if (g.length !== 15) return false;
  return GSTIN_REGEX.test(g);
}
