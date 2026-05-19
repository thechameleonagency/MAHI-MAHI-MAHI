/**
 * Resolve route :id params to canonical string entity ids.
 */

export function resolveRouteId(id: string | undefined): string {
  if (id == null) return "";
  return String(id).trim();
}

export function findByRouteId<T extends { id: string | number }>(
  items: T[],
  routeId: string | undefined,
): T | undefined {
  const key = resolveRouteId(routeId);
  if (!key) return undefined;
  return items.find((item) => String(item.id) === key);
}
