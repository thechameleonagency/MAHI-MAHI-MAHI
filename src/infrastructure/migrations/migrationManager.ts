const SCHEMA_VERSION_KEY = "mss.schema.version";
const APP_VERSION_KEY = "mss.app.version";
const CURRENT_SCHEMA_VERSION = 3;
const CURRENT_APP_VERSION = "phase-4-modular-v2";

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
          localStorage.setItem(key, value);
        }
      });
    },
  },
  {
    toVersion: 2,
    run: () => {
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
        localStorage.setItem("mss.migration.backup.v2", JSON.stringify(backup));
      }
      keysToClear.forEach(key => localStorage.removeItem(key));
    },
  },
  {
    toVersion: 3,
    run: () => {
      const keysToBackup = Object.keys(localStorage).filter(
        key => key.startsWith("mss.repo.") || key === "mahi_solar_app_data"
      );
      const backup: Record<string, string> = {};
      keysToBackup.forEach(key => { const v = localStorage.getItem(key); if (v) backup[key] = v; });
      if (Object.keys(backup).length > 0) {
        localStorage.setItem("mss.migration.backup.v3", JSON.stringify(backup));
      }
      keysToBackup.forEach(key => localStorage.removeItem(key));
      localStorage.removeItem("mss.repo.projectTimelineByProjectId");
    },
  },
];

export const runMigrations = (): void => {
  const existingVersion = Number(localStorage.getItem(SCHEMA_VERSION_KEY) || "0");

  migrations
    .filter((migration) => migration.toVersion > existingVersion)
    .sort((a, b) => a.toVersion - b.toVersion)
    .forEach((migration) => migration.run());

  localStorage.setItem(SCHEMA_VERSION_KEY, String(CURRENT_SCHEMA_VERSION));
  localStorage.setItem(APP_VERSION_KEY, CURRENT_APP_VERSION);
};
