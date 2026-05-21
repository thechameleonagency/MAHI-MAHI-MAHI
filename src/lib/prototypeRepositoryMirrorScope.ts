/**
 * AR3 — prototype repository mirror scope, single-writer rules, and drift detection.
 *
 * Canonical store: `mahi_solar_app_data`. Mirrors: `mss.repo.*` refreshed from AppState
 * before/after commands and on every AppState commit (AR1).
 */

import type { AppState } from "@/contexts/AppDataContext";
import type { AppRepositoryContext } from "@/infrastructure/repositories/contracts";
import {
  APP_STATE_CONTEXT_ONLY_SLICES,
  PROTOTYPE_REPOSITORY_CONTEXT_MAP,
  PROTOTYPE_REPOSITORY_MIRROR_SLICES,
  type PrototypeRepositoryKey,
} from "@/infrastructure/repositories/prototypeRepositoryManifest";

export const PROTOTYPE_MIRROR_SCOPE_SUMMARY =
  "Eleven AppState collections mirror into mss.repo.* (CRM, inventory, audit, plus sites, tasks, vendors). Finance and vendor-ledger slices stay context-only; UI always reads AppDataContext.";

export const SINGLE_WRITER_RULE =
  "Only AppDataContext mutates business data. Repository mirrors are read/write scratch pads for the command bus — never edit mss.repo.* directly in UI or automation.";

export const PROTOTYPE_MIRROR_DIVERGENCE_RULE =
  "After every AppState commit, mirrors sync from the canonical snapshot. External readers of mss.repo.tasks, mss.repo.sites, or mss.repo.vendors see the same rows as AppData; do not treat context-only finance slices as repo-backed.";

export type MirrorDriftRow = {
  slice: PrototypeRepositoryKey;
  issue: "count_mismatch" | "missing_in_repo" | "extra_in_repo";
  stateCount: number;
  repoCount: number;
  ids?: string[];
};

function entityId(value: { id: string | number }): string {
  return String(value.id);
}

/** Compare mirrored AppState slices with in-memory repository contents (post-sync). */
export function findPrototypeMirrorDrift(
  state: AppState,
  repositories: AppRepositoryContext,
): MirrorDriftRow[] {
  const rows: MirrorDriftRow[] = [];

  for (const slice of PROTOTYPE_REPOSITORY_MIRROR_SLICES) {
    const repoProp = PROTOTYPE_REPOSITORY_CONTEXT_MAP[slice.key];
    const stateItems = slice.select(state) as { id: string | number }[];
    const repoItems = repositories[repoProp].getAll();

    const stateIds = new Set(stateItems.map(entityId));
    const repoIds = new Set(repoItems.map(entityId));

    if (stateIds.size !== repoIds.size) {
      rows.push({
        slice: slice.key,
        issue: "count_mismatch",
        stateCount: stateIds.size,
        repoCount: repoIds.size,
      });
      continue;
    }

    const missingInRepo = [...stateIds].filter((id) => !repoIds.has(id));
    if (missingInRepo.length > 0) {
      rows.push({
        slice: slice.key,
        issue: "missing_in_repo",
        stateCount: stateIds.size,
        repoCount: repoIds.size,
        ids: missingInRepo.slice(0, 5),
      });
      continue;
    }

    const extraInRepo = [...repoIds].filter((id) => !stateIds.has(id));
    if (extraInRepo.length > 0) {
      rows.push({
        slice: slice.key,
        issue: "extra_in_repo",
        stateCount: stateIds.size,
        repoCount: repoIds.size,
        ids: extraInRepo.slice(0, 5),
      });
    }
  }

  return rows;
}

export function mirroredSliceLabels(): string[] {
  return PROTOTYPE_REPOSITORY_MIRROR_SLICES.map((s) => s.key);
}

export function contextOnlySliceLabels(): readonly string[] {
  return APP_STATE_CONTEXT_ONLY_SLICES;
}

export function formatMirrorDriftError(row: MirrorDriftRow): string {
  const idHint = row.ids?.length ? ` (e.g. ${row.ids.join(", ")})` : "";
  return `${row.slice}: ${row.issue} — AppState ${row.stateCount} vs repo ${row.repoCount}${idHint}`;
}
