import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { FeaturePermissionMatrix } from "@/domain/policies/featurePermissions";
import {
  buildFeaturePermissionMatrixDraft,
  DEFAULT_FEATURE_PERMISSIONS,
  migrateRoleMatrixOverride,
} from "@/domain/policies/featurePermissions";

const STORAGE_KEY = "mss.roleMatrix.v1";
const STORAGE_VERSION = 1;

type StoredOverride = {
  version: number;
  savedAt: string;
  overrides: Partial<FeaturePermissionMatrix>;
};

interface RoleMatrixContextValue {
  /** Currently active override matrix (undefined when defaults are in use). */
  override: Partial<FeaturePermissionMatrix> | undefined;
  /** Resolved matrix (override merged onto defaults). */
  effectiveMatrix: FeaturePermissionMatrix;
  /** True when a saved override exists. */
  hasOverride: boolean;
  /** Persist a new override. Pass `undefined` to reset to defaults. */
  saveOverride: (next: Partial<FeaturePermissionMatrix> | undefined) => void;
  /** Wipe localStorage + revert to defaults. */
  resetToDefaults: () => void;
}

const RoleMatrixContext = createContext<RoleMatrixContextValue | undefined>(undefined);

function loadFromStorage(): Partial<FeaturePermissionMatrix> | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as StoredOverride;
    if (parsed?.version !== STORAGE_VERSION) return undefined;
    return migrateRoleMatrixOverride(parsed.overrides ?? undefined);
  } catch {
    return undefined;
  }
}

function persistToStorage(override: Partial<FeaturePermissionMatrix> | undefined): void {
  if (typeof window === "undefined") return;
  try {
    if (!override || Object.keys(override).length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const payload: StoredOverride = {
      version: STORAGE_VERSION,
      savedAt: new Date().toISOString(),
      overrides: override,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* localStorage quota / private mode — silent fail */
  }
}

export function RoleMatrixProvider({ children }: { children: ReactNode }) {
  const [override, setOverride] = useState<Partial<FeaturePermissionMatrix> | undefined>(
    () => loadFromStorage(),
  );

  // React to storage events from other tabs.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return;
      setOverride(loadFromStorage());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const saveOverride = useCallback((next: Partial<FeaturePermissionMatrix> | undefined) => {
    const normalized = migrateRoleMatrixOverride(next);
    persistToStorage(normalized);
    setOverride(normalized);
  }, []);

  const resetToDefaults = useCallback(() => {
    persistToStorage(undefined);
    setOverride(undefined);
  }, []);

  const effectiveMatrix: FeaturePermissionMatrix = useMemo(
    () => buildFeaturePermissionMatrixDraft(override),
    [override],
  );

  const value: RoleMatrixContextValue = {
    override,
    effectiveMatrix,
    hasOverride: !!override && Object.keys(override).length > 0,
    saveOverride,
    resetToDefaults,
  };

  return <RoleMatrixContext.Provider value={value}>{children}</RoleMatrixContext.Provider>;
}

export function useRoleMatrix(): RoleMatrixContextValue {
  const ctx = useContext(RoleMatrixContext);
  if (!ctx) {
    // Sensible fallback: defaults-only, read-only-style. Lets tests / standalone components run.
    return {
      override: undefined,
      effectiveMatrix: DEFAULT_FEATURE_PERMISSIONS,
      hasOverride: false,
      saveOverride: () => {},
      resetToDefaults: () => {},
    };
  }
  return ctx;
}

/** Returns just the override (or undefined) — useful for `canFeature(..., override)` calls. */
export function useRoleMatrixOverride(): Partial<FeaturePermissionMatrix> | undefined {
  return useRoleMatrix().override;
}
