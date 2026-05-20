/** Local draft persistence for long create/edit sheets (localStorage; not encrypted). */

export const FORM_DRAFT_STORAGE_PREFIX = "mss.draft.";

const prefix = FORM_DRAFT_STORAGE_PREFIX;

export function loadFormDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(prefix + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveFormDraft<T>(key: string, value: T): void {
  try {
    localStorage.setItem(prefix + key, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearFormDraft(key: string): void {
  try {
    localStorage.removeItem(prefix + key);
  } catch {
    /* noop */
  }
}

/** Remove every persisted form draft (Settings reset / prototype wipe). */
export function clearAllFormDrafts(): string[] {
  const removed: string[] = [];
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  for (const key of keys) {
    localStorage.removeItem(key);
    removed.push(key);
  }
  return removed;
}
