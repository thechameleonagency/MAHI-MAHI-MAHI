/** Browser-side guard for CSV / image uploads (prototype). */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export function fileExceedsLimit(file: File, maxBytes = MAX_UPLOAD_BYTES): boolean {
  return file.size > maxBytes;
}
