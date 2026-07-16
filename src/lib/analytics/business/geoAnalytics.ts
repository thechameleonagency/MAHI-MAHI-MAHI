/**
 * Geographic coverage analytics keyed by Indian pincode.
 * Projects carry no pincode field, so we extract a 6-digit pincode from the
 * free-text location/address fields and fall back to the linked quotation's
 * `clientPincode`.
 */
import type { Project, Quotation } from "@/types/project";
import { inWindow, parseIsoDate, type BusinessWindow } from "./timeBuckets";

const PINCODE_RE = /\b[1-9][0-9]{5}\b/;

export function extractPincode(...texts: (string | undefined | null)[]): string | null {
  for (const t of texts) {
    if (!t) continue;
    const m = t.match(PINCODE_RE);
    if (m) return m[0];
  }
  return null;
}

/** Parse a kW capacity out of a free-form string like "5.5 kW" / "10KW". */
export function parseKw(capacity: string | undefined | null): number {
  if (!capacity) return 0;
  const m = String(capacity).match(/(\d+(?:\.\d+)?)/);
  if (!m) return 0;
  const n = Number.parseFloat(m[1]);
  return Number.isFinite(n) ? n : 0;
}

export type AreaGrowth = "new" | "growing" | "flat" | "declining";

export interface PincodeStats {
  pincode: string;
  projects: number;
  totalKw: number;
  contractValue: number;
  /** Project count in the recent half of the window vs the earlier half. */
  recentCount: number;
  priorCount: number;
  growth: AreaGrowth;
}

export interface GeoAnalytics {
  areas: PincodeStats[];
  withPincode: number;
  withoutPincode: number;
  top: PincodeStats | null;
  least: PincodeStats | null;
  fastestGrowing: PincodeStats | null;
}

const projectDateIso = (p: Project): string | undefined => p.startDate || p.createdAt;

export function computeGeoAnalytics(
  projects: Project[],
  quotations: Quotation[],
  window: BusinessWindow,
): GeoAnalytics {
  const quotationById = new Map(quotations.map((q) => [q.id, q]));
  const inPeriod = projects.filter((p) => inWindow(projectDateIso(p), window));
  const midpoint = new Date((window.from.getTime() + window.to.getTime()) / 2);

  const byPincode = new Map<string, PincodeStats>();
  let withoutPincode = 0;

  for (const p of inPeriod) {
    const quotation = p.quotationId ? quotationById.get(p.quotationId) : undefined;
    const pincode = extractPincode(
      p.location,
      p.clientAddress,
      p.address,
      quotation?.clientPincode,
      quotation?.clientAddress,
    );
    if (!pincode) {
      withoutPincode++;
      continue;
    }
    const stats =
      byPincode.get(pincode) ??
      ({
        pincode,
        projects: 0,
        totalKw: 0,
        contractValue: 0,
        recentCount: 0,
        priorCount: 0,
        growth: "flat",
      } as PincodeStats);
    stats.projects++;
    stats.totalKw += parseKw(p.capacity);
    stats.contractValue += p.contractAmount || 0;
    const d = parseIsoDate(projectDateIso(p));
    if (d && d >= midpoint) stats.recentCount++;
    else stats.priorCount++;
    byPincode.set(pincode, stats);
  }

  const areas = [...byPincode.values()]
    .map((s) => ({
      ...s,
      totalKw: Math.round(s.totalKw * 100) / 100,
      growth:
        s.priorCount === 0 && s.recentCount > 0
          ? ("new" as const)
          : s.recentCount > s.priorCount
            ? ("growing" as const)
            : s.recentCount < s.priorCount
              ? ("declining" as const)
              : ("flat" as const),
    }))
    .sort((a, b) => b.projects - a.projects || b.contractValue - a.contractValue);

  const growingSorted = areas
    .filter((a) => a.growth === "growing" || a.growth === "new")
    .sort((a, b) => b.recentCount - a.recentCount);

  return {
    areas,
    withPincode: inPeriod.length - withoutPincode,
    withoutPincode,
    top: areas[0] ?? null,
    least: areas.length > 1 ? areas[areas.length - 1] : null,
    fastestGrowing: growingSorted[0] ?? null,
  };
}
