import type { Partner, Subcontractor } from "@/types/finance";

export interface SubcontractorLookupContext {
  subcontractors: Subcontractor[];
  partners: Partner[];
}

/** Resolve subcontractor from dedicated collection, with legacy Partner(Subcontractor) fallback. */
export function resolveSubcontractor(
  id: string | undefined,
  ctx: SubcontractorLookupContext,
): Subcontractor | undefined {
  if (!id?.trim()) return undefined;
  const fromCollection = ctx.subcontractors.find((row) => row.id === id);
  if (fromCollection) return fromCollection;
  const legacyPartner = ctx.partners.find((row) => row.id === id && row.type === "Subcontractor");
  if (legacyPartner) {
    return {
      id: legacyPartner.id,
      name: legacyPartner.name,
      phone: legacyPartner.phone ?? "",
      createdAt: new Date().toISOString(),
      migratedFromPartnerId: legacyPartner.id,
    };
  }
  return undefined;
}

export function listSubcontractorSelectOptions(
  ctx: SubcontractorLookupContext,
): Array<{ id: string; name: string }> {
  const fromCollection = ctx.subcontractors.map((row) => ({ id: row.id, name: row.name }));
  if (fromCollection.length > 0) return fromCollection;
  return ctx.partners
    .filter((row) => row.type === "Subcontractor")
    .map((row) => ({ id: row.id, name: row.name }));
}
