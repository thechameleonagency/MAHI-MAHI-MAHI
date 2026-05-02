const SCHEMA_VERSION_KEY = "mss.schema.version";
const APP_VERSION_KEY = "mss.app.version";
const CURRENT_SCHEMA_VERSION = 1;
const CURRENT_APP_VERSION = "phase-1-foundation";

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
