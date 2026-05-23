const SCHEMA_VERSION_KEY = "mss.schema.version";
const APP_VERSION_KEY = "mss.app.version";
const APP_DATA_STORAGE_KEY = "mahi_solar_app_data";
const MIGRATION_BACKUP_KEYS = ["mss.migration.backup.v2", "mss.migration.backup.v3"] as const;
const CURRENT_SCHEMA_VERSION = 5;
const CURRENT_APP_VERSION = "phase-4-modular-v2";

import { runQuotationProjectLinkStorageMigration } from "@/infrastructure/migrations/quotationProjectLinkMigration";

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn(`[MSS] localStorage setItem failed for ${key}:`, error);
    }
    return false;
  }
}

/** True when canonical app blob already holds business data (skip legacy repo-wipe migrations). */
function hasModernAppDataBlob(): boolean {
  try {
    const raw = localStorage.getItem(APP_DATA_STORAGE_KEY);
    return Boolean(raw && raw.length > 2 && raw !== "{}" && raw !== "null");
  } catch {
    return false;
  }
}

function clearMigrationBackups(): void {
  for (const key of MIGRATION_BACKUP_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

type MigrationStep = {
  toVersion: number;
  run: () => void;
};

const migrations: MigrationStep[] = [
  {
    toVersion: 1,
    run: () => {
      const defaults: Record<string, string> = {
        "mss.repo.projects": "[]",
        "mss.repo.quotations": "[]",
        "mss.repo.enquiries": "[]",
        "mss.repo.customers": "[]",
        "mss.repo.invoices": "[]",
        "mss.repo.employees": "[]",
        "mss.repo.auditLogs": "[]",
      };

      Object.entries(defaults).forEach(([key, value]) => {
        if (!localStorage.getItem(key)) {
          safeSetItem(key, value);
        }
      });
    },
  },
  {
    toVersion: 2,
    run: () => {
      if (hasModernAppDataBlob()) return;
      const keysToClear = [
        "mss.repo.projects",
        "mss.repo.quotations",
        "mss.repo.enquiries",
        "mss.repo.customers",
        "mss.repo.invoices",
        "mss.repo.employees",
        "mss.repo.partners",
        "mss.repo.expenses",
        "mss.repo.inventoryItems",
        "mss.repo.agents",
      ];
      const backup: Record<string, string> = {};
      keysToClear.forEach(key => { const v = localStorage.getItem(key); if (v) backup[key] = v; });
      if (Object.keys(backup).length > 0) {
        safeSetItem("mss.migration.backup.v2", JSON.stringify(backup));
      }
      keysToClear.forEach(key => localStorage.removeItem(key));
    },
  },
  {
    toVersion: 3,
    run: () => {
      // Legacy one-time migration from repo-only storage. Never wipe when app blob exists.
      if (hasModernAppDataBlob()) return;

      const keysToBackup = Object.keys(localStorage).filter(
        key => key.startsWith("mss.repo.") || key === APP_DATA_STORAGE_KEY
      );
      const backup: Record<string, string> = {};
      keysToBackup.forEach(key => { const v = localStorage.getItem(key); if (v) backup[key] = v; });
      if (Object.keys(backup).length > 0) {
        const backedUp = safeSetItem("mss.migration.backup.v3", JSON.stringify(backup));
        if (!backedUp) {
          if (import.meta.env.DEV) {
            console.warn("[MSS] Skipping migration v3 repo wipe — backup would exceed localStorage quota.");
          }
          return;
        }
      }
      keysToBackup.forEach(key => localStorage.removeItem(key));
      localStorage.removeItem("mss.repo.projectTimelineByProjectId");
    },
  },
  {
    toVersion: 4,
    run: () => {
      runQuotationProjectLinkStorageMigration();
    },
  },
  {
    toVersion: 5,
    run: () => {
      const defaults: Record<string, string> = {
        "mss.repo.sites": "[]",
        "mss.repo.tasks": "[]",
        "mss.repo.vendors": "[]",
      };
      Object.entries(defaults).forEach(([key, value]) => {
        if (!localStorage.getItem(key)) {
          safeSetItem(key, value);
        }
      });
    },
  },
];

export const runMigrations = (): void => {
  const existingVersion = Number(localStorage.getItem(SCHEMA_VERSION_KEY) || "0");

  migrations
    .filter((migration) => migration.toVersion > existingVersion)
    .sort((a, b) => a.toVersion - b.toVersion)
    .forEach((migration) => {
      try {
        migration.run();
      } catch (error) {
        console.error(`[MSS] Migration v${migration.toVersion} failed:`, error);
      }
    });

  safeSetItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
  safeSetItem(APP_VERSION_KEY, CURRENT_APP_VERSION);
  clearMigrationBackups();
};
