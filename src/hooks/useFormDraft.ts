import { useCallback, useEffect, useRef, useState } from "react";
import { clearFormDraft, loadFormDraft, saveFormDraft } from "@/lib/formDraftStorage";

type UseFormDraftOptions = {
  debounceMs?: number;
};

/**
 * Persists form state to localStorage (prototype-only).
 * Loads saved draft on mount; saves debounced on every change.
 */
export function useFormDraft<T>(
  key: string,
  initialValue: T,
  options?: UseFormDraftOptions,
) {
  const debounceMs = options?.debounceMs ?? 500;
  const initialRef = useRef(initialValue);
  initialRef.current = initialValue;

  const [value, setValue] = useState<T>(() => loadFormDraft<T>(key) ?? initialValue);

  useEffect(() => {
    const timer = window.setTimeout(() => saveFormDraft(key, value), debounceMs);
    return () => window.clearTimeout(timer);
  }, [key, value, debounceMs]);

  const clearDraft = useCallback(() => {
    clearFormDraft(key);
    setValue(initialRef.current);
  }, [key]);

  return { value, setValue, clearDraft };
}
