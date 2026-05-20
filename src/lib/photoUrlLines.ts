/** Split comma- or newline-separated photo URL input into trimmed non-empty lines. */
export function parsePhotoUrlLines(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** True when the string is an absolute http(s) URL parseable by the URL constructor. */
export function isValidAbsoluteUrl(candidate: string): boolean {
  try {
    const u = new URL(candidate);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Parse lines and partition into valid http(s) URLs vs invalid entries (Mn16). */
export function parseValidatedPhotoUrlLines(raw: string): { valid: string[]; invalid: string[] } {
  const lines = parsePhotoUrlLines(raw);
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const line of lines) {
    if (isValidAbsoluteUrl(line)) valid.push(line);
    else invalid.push(line);
  }
  return { valid, invalid };
}

/** Filter an existing URL list to http(s) absolutes only (persist boundary). */
export function sanitizePhotoUrlList(urls: string[] | undefined): string[] | undefined {
  if (!urls?.length) return undefined;
  const clean = urls.filter(isValidAbsoluteUrl);
  return clean.length ? clean : undefined;
}
