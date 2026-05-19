/**
 * One-time localStorage migration: numeric entity IDs → prefixed strings.
 */
const STORAGE_VERSION_KEY = "mss_storage_version";
export const CURRENT_STORAGE_VERSION = 2;

const pad = (n: number, w = 3) => String(n).padStart(w, "0");
const emp = (n: number) => `EMP${pad(n)}`;
const inv = (n: number) => `INV${pad(n)}`;
const site = (n: number) => `SITE${pad(n)}`;
const tool = (n: number) => `TOOL${pad(n)}`;

function mapId(value: unknown, prefix: "emp" | "inv" | "site" | "tool"): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    if (/^(EMP|INV|SITE|TOOL|V)/.test(value)) return value;
    const n = Number(value);
    if (!Number.isFinite(n)) return value;
    value = n;
  }
  if (typeof value !== "number") return value;
  switch (prefix) {
    case "emp":
      return emp(value);
    case "inv":
      return inv(value);
    case "site":
      return site(value);
    case "tool":
      return tool(value);
    default:
      return value;
  }
}

function mapArray(arr: unknown, mapper: (v: unknown) => unknown): unknown[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(mapper);
}

function walk(obj: unknown): unknown {
  if (obj == null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(walk);

  const o = obj as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(o)) {
    if (key === "id" && typeof val === "number") {
      // Heuristic by sibling fields
      if ("salary" in o || "wallet" in o || "aadhar" in o) out[key] = mapId(val, "emp");
      else if ("stock" in o || "hsn" in o || "buyPrice" in o) out[key] = mapId(val, "inv");
      else if ("projectId" in o && "checklistItems" in o) out[key] = mapId(val, "site");
      else if ("condition" in o && "category" in o) out[key] = mapId(val, "tool");
      else out[key] = val;
      continue;
    }
    if (
      key === "employeeId" ||
      key === "leadId" ||
      key === "visitedBy" ||
      key === "markedBy" ||
      key === "addedByEmployeeId"
    ) {
      out[key] = mapId(val, "emp");
      continue;
    }
    if (key === "itemId" || key === "inventoryItemId") {
      out[key] = mapId(val, "inv");
      continue;
    }
    if (key === "vendorId") {
      out[key] = typeof val === "number" ? `V${pad(val)}` : val;
      continue;
    }
    if (key === "memberIds" || key === "assignees" || key === "teamMealEmployeeIds" || key === "assignedTo") {
      out[key] = mapArray(val, (v) => mapId(v, "emp"));
      continue;
    }
    out[key] = walk(val);
  }
  return out;
}

export function migratePersistedState<T>(raw: T): T {
  return walk(raw) as T;
}

export function readStorageVersion(): number {
  try {
    const v = localStorage.getItem(STORAGE_VERSION_KEY);
    return v ? Number(v) : 1;
  } catch {
    return 1;
  }
}

export function writeStorageVersion(version: number): void {
  try {
    localStorage.setItem(STORAGE_VERSION_KEY, String(version));
  } catch {
    /* ignore */
  }
}

export function applyStorageMigrationIfNeeded<T>(parsed: T): T {
  const ver = readStorageVersion();
  if (ver >= CURRENT_STORAGE_VERSION) return parsed;
  const migrated = migratePersistedState(parsed);
  writeStorageVersion(CURRENT_STORAGE_VERSION);
  return migrated;
}
