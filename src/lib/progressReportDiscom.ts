import type { ProjectTimelineStatus } from "@/types/blockage";
import type { AppState } from "@/contexts/AppDataContext";

/** Canonical DISCOM pipeline order (sequential checkboxes). */
export const DISCOM_CHECK_ORDER = [
  "meter-file-submit",
  "net-metering",
  "subsidy-apply-photo",
] as const;

export type DiscomCheckValue = (typeof DISCOM_CHECK_ORDER)[number];

export const DISCOM_CHECK_LABELS: Record<DiscomCheckValue, string> = {
  "meter-file-submit": "Meter & File Submit DISCOM",
  "net-metering": "Net Metering",
  "subsidy-apply-photo": "Subsidy Apply with Site Photos",
};

export type DiscomCheckApplyResult =
  | { ok: true; checks: string[] }
  | { ok: false; reason: string };

/**
 * Apply or remove a DISCOM checkbox while preserving sequential order.
 * Unchecking a step clears all later steps.
 */
export function applyDiscomCheckChange(
  currentChecks: string[],
  item: string,
  checked: boolean,
): DiscomCheckApplyResult {
  const itemIndex = DISCOM_CHECK_ORDER.indexOf(item as DiscomCheckValue);
  if (itemIndex < 0) {
    return { ok: false, reason: "Unknown DISCOM step" };
  }

  let newChecks = [...currentChecks];

  if (checked) {
    const canCheck =
      itemIndex === 0 ||
      DISCOM_CHECK_ORDER.slice(0, itemIndex).every((step) => newChecks.includes(step));
    if (!canCheck) {
      return { ok: false, reason: "Complete previous DISCOM steps first" };
    }
    if (!newChecks.includes(item)) {
      newChecks.push(item);
    }
    return { ok: true, checks: normalizeDiscomChecks(newChecks) };
  }

  newChecks = newChecks.filter((c) => {
    const cIndex = DISCOM_CHECK_ORDER.indexOf(c as DiscomCheckValue);
    return cIndex >= 0 && cIndex < itemIndex;
  });
  return { ok: true, checks: newChecks };
}

/** Keep only a valid prefix of the DISCOM sequence (no gaps). */
export function normalizeDiscomChecks(checks: string[]): string[] {
  const set = new Set(checks);
  const out: string[] = [];
  for (const step of DISCOM_CHECK_ORDER) {
    if (!set.has(step)) break;
    out.push(step);
  }
  return out;
}

export function isDiscomCheckOrderValid(checks: string[]): boolean {
  return normalizeDiscomChecks(checks).length === checks.length;
}

export type StaleDiscomCheckOrder = {
  projectId: string;
  invalidChecks: string[];
};

export function findStaleDiscomCheckOrder(
  timelines: Record<string, ProjectTimelineStatus>,
): StaleDiscomCheckOrder[] {
  const stale: StaleDiscomCheckOrder[] = [];
  for (const [projectId, tl] of Object.entries(timelines)) {
    const checks = tl.discomChecks ?? [];
    if (checks.length === 0) continue;
    if (!isDiscomCheckOrderValid(checks)) {
      stale.push({ projectId, invalidChecks: checks });
    }
  }
  return stale;
}

/** Repair persisted timelines with out-of-order DISCOM checks (hydrate / seed). */
export function reconcileProjectTimelineDiscomChecks(state: AppState): AppState {
  let changed = false;
  const projectTimelineByProjectId = { ...state.projectTimelineByProjectId };

  for (const [projectId, tl] of Object.entries(projectTimelineByProjectId)) {
    const checks = tl.discomChecks ?? [];
    if (checks.length === 0) continue;
    const normalized = normalizeDiscomChecks(checks);
    if (normalized.length !== checks.length || normalized.some((c, i) => c !== checks[i])) {
      projectTimelineByProjectId[projectId] = {
        ...tl,
        discomChecks: normalized,
        updatedAt: new Date().toISOString(),
      };
      changed = true;
    }
  }

  return changed ? { ...state, projectTimelineByProjectId } : state;
}
