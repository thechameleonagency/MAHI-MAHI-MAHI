import type { MaterialReservation } from "@/types/operations";

export type MaterialReservationRelease = {
  itemId: string;
  qty: number;
  projectId: string;
  reason: string;
};

/** Reduce or release active reservations for a project/item (FIFO by createdAt). */
export function applyMaterialReservationReleases(
  reservations: MaterialReservation[],
  release: MaterialReservationRelease,
): MaterialReservation[] {
  let remaining = release.qty;
  if (remaining <= 0) return reservations;

  const now = new Date().toISOString();
  const candidates = reservations
    .filter(
      (r) =>
        !r.releasedAt &&
        r.projectId === release.projectId &&
        String(r.itemId) === String(release.itemId) &&
        r.qty > 0,
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return reservations.map((r) => {
    if (remaining <= 0) return r;
    const idx = candidates.findIndex((c) => c.id === r.id);
    if (idx < 0) return r;

    const take = Math.min(r.qty, remaining);
    remaining -= take;
    const nextQty = r.qty - take;
    if (nextQty <= 0) {
      return { ...r, qty: 0, releasedAt: now };
    }
    return { ...r, qty: nextQty };
  });
}

export type StaleChangeRequestMaterial = {
  changeRequestId: string;
  projectId: string;
  itemId: string;
  reason: "missing_reservation_for_positive_delta" | "unreleased_after_negative_delta";
};

/** Approved CR material deltas should be reflected in active reservations (V4). */
export function findStaleChangeRequestMaterialReservations(
  changeRequests: import("@/types/operations").ProjectChangeRequest[],
  reservations: MaterialReservation[],
): StaleChangeRequestMaterial[] {
  const stale: StaleChangeRequestMaterial[] = [];
  for (const cr of changeRequests) {
    if (cr.status !== "approved" || !cr.materialDelta?.length) continue;
    for (const md of cr.materialDelta) {
      if (!md.itemId?.trim() || md.deltaQty === 0) continue;
      const activeQty = reservations
        .filter(
          (r) =>
            !r.releasedAt &&
            r.projectId === cr.projectId &&
            String(r.itemId) === String(md.itemId) &&
            r.reason?.includes(cr.id),
        )
        .reduce((sum, r) => sum + r.qty, 0);

      if (md.deltaQty > 0 && activeQty < md.deltaQty) {
        stale.push({
          changeRequestId: cr.id,
          projectId: cr.projectId,
          itemId: md.itemId,
          reason: "missing_reservation_for_positive_delta",
        });
      }
    }
  }
  return stale;
}
