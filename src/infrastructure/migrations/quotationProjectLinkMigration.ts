import type { Quotation } from "@/types/project";
import { migrateQuotationsProjectLinks } from "@/lib/quotationProjectLink";

const APP_DATA_KEY = "mahi_solar_app_data";
const REPO_QUOTATIONS_KEY = "mss.repo.quotations";

function migrateQuotationArrayInStorage(storageKey: string): boolean {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return false;
  try {
    const parsed = JSON.parse(raw) as Quotation[] | { quotations?: Quotation[] };
    if (Array.isArray(parsed)) {
      const migrated = migrateQuotationsProjectLinks(parsed);
      localStorage.setItem(storageKey, JSON.stringify(migrated));
      return true;
    }
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.quotations)) {
      const migrated = migrateQuotationsProjectLinks(parsed.quotations);
      localStorage.setItem(storageKey, JSON.stringify({ ...parsed, quotations: migrated }));
      return true;
    }
  } catch {
    /* ignore corrupt JSON */
  }
  return false;
}

/** Persisted localStorage migration: legacy `convertedToProjectId` → `linkedProjectId`. */
export function runQuotationProjectLinkStorageMigration(): void {
  migrateQuotationArrayInStorage(REPO_QUOTATIONS_KEY);
  migrateQuotationArrayInStorage(APP_DATA_KEY);
}
