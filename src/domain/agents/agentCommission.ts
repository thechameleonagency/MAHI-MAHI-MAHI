/** Expected agent fee from project terms (prototype — does not fetch live invoices). */
export function expectedAgentFeeForProject(params: {
  ratePerKw: number;
  rateType: "per-kw" | "per-project";
  flatRate?: number;
  /** Parse kW from project.capacity e.g. "5 kW" -> 5 */
  capacityKw: number;
}): number {
  if (params.rateType === "per-project") {
    return params.flatRate ?? params.ratePerKw ?? 0;
  }
  return params.ratePerKw * params.capacityKw;
}

export function parseCapacityKw(capacity: string | undefined): number {
  if (!capacity) return 0;
  const m = capacity.match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}
