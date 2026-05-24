import type { Partner, Subcontractor } from "@/types/finance";
import type { Project } from "@/types/project";

/** One-time migration: Partner type Subcontractor → Subcontractor entity. */
export function migrateSubcontractorsFromPartners(
  partners: Partner[],
  existing: Subcontractor[],
  projects: Project[],
): { subcontractors: Subcontractor[]; projects: Project[]; partners: Partner[] } {
  const subs = [...existing];
  const partnerIdToSubId = new Map<string, string>();
  const migratedPartnerIds = new Set(
    subs.map((s) => s.migratedFromPartnerId).filter(Boolean) as string[],
  );

  for (const partner of partners) {
    if (partner.type !== "Subcontractor") continue;
    if (migratedPartnerIds.has(partner.id)) {
      const existingSub = subs.find((s) => s.migratedFromPartnerId === partner.id);
      if (existingSub) partnerIdToSubId.set(partner.id, existingSub.id);
      continue;
    }
    const subId = `SUB-${partner.id.replace(/^PT-?/, "")}`;
    subs.push({
      id: subId,
      name: partner.name,
      phone: partner.phone,
      email: partner.email,
      address: partner.address,
      defaultRatePerKw: partner.defaultRatePerKw,
      notes: partner.notes,
      createdAt: partner.createdAt ?? new Date().toISOString(),
      migratedFromPartnerId: partner.id,
    });
    partnerIdToSubId.set(partner.id, subId);
  }

  const updatedProjects = projects.map((p) => {
    if (!p.outsource?.partyId) return p;
    const newId = partnerIdToSubId.get(p.outsource.partyId);
    if (!newId) return p;
    return {
      ...p,
      outsource: { ...p.outsource, partyId: newId },
    };
  });

  return { subcontractors: subs, projects: updatedProjects, partners };
}

export function ensureSubcontractorMigration<T extends {
  partners: Partner[];
  subcontractors?: Subcontractor[];
  projects: Project[];
}>(state: T): T {
  const existing = state.subcontractors ?? [];
  const { subcontractors, projects } = migrateSubcontractorsFromPartners(
    state.partners,
    existing,
    state.projects,
  );
  if (subcontractors.length === existing.length && projects === state.projects) {
    return { ...state, subcontractors: existing };
  }
  return { ...state, subcontractors, projects };
}
