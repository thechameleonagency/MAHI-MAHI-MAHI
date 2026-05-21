import type { ProjectKind } from "@/domain/projectTypes/types";
import type { ProjectLifecycleStatus } from "@/domain/stateMachines/projectStateMachine";

/** Appendix R — capability outcome specs for project generation. */
export interface CapabilityProjectSpec {
  kind: ProjectKind;
  lifecycle: ProjectLifecycleStatus;
  /** How many projects of this spec (full profile). */
  count: number;
  category: "residential" | "commercial" | "industrial";
  capacityKw: number;
  paymentType: "cash" | "loan" | "cash-and-loan";
  withAgent?: boolean;
  withOutsource?: boolean;
  multiSite?: boolean;
  richTimeline?: boolean;
  edgeTag?: string;
}

/** ≥2 per outcome where min-projects applies; edge-only rows tagged separately. */
export function capabilityProjectSpecs(fullProfile: boolean): CapabilityProjectSpec[] {
  const n = (c: number) => (fullProfile ? c : Math.max(1, Math.round(c * 0.3)));
  return [
    // DIRECT_CLIENT MSS full
    { kind: "SOLO_EPC", lifecycle: "In Progress", count: n(3), category: "residential", capacityKw: 5, paymentType: "cash", richTimeline: true },
    { kind: "SOLO_EPC", lifecycle: "Completed", count: n(2), category: "commercial", capacityKw: 10, paymentType: "loan" },
    { kind: "SOLO_EPC", lifecycle: "In Progress", count: n(2), category: "industrial", capacityKw: 50, paymentType: "cash-and-loan", withAgent: true, multiSite: true },
    // DIRECT_CLIENT service_only (INC)
    { kind: "INC", lifecycle: "In Progress", count: n(1), category: "residential", capacityKw: 3, paymentType: "cash" },
    { kind: "INC", lifecycle: "Completed", count: n(1), category: "commercial", capacityKw: 7, paymentType: "cash" },
    // OUTSOURCED_INC
    { kind: "OUTSOURCED_INC", lifecycle: "In Progress", count: n(1), category: "commercial", capacityKw: 15, paymentType: "cash", withOutsource: true },
    { kind: "OUTSOURCED_INC", lifecycle: "Completed", count: n(1), category: "residential", capacityKw: 5, paymentType: "cash", withOutsource: true },
    // PARTNER_NETWORK epc
    { kind: "PARTNER_EPC", lifecycle: "In Progress", count: n(3), category: "commercial", capacityKw: 25, paymentType: "cash", richTimeline: true, withAgent: true },
    { kind: "PARTNER_EPC", lifecycle: "Completed", count: n(2), category: "industrial", capacityKw: 100, paymentType: "loan" },
    // fixed_margin
    { kind: "FIXED_EPC", lifecycle: "In Progress", count: n(1), category: "commercial", capacityKw: 20, paymentType: "cash" },
    { kind: "FIXED_EPC", lifecycle: "Completed", count: n(1), category: "residential", capacityKw: 7, paymentType: "cash" },
    // vendor_channel
    { kind: "VENDOR_NETWORK", lifecycle: "In Progress", count: n(1), category: "commercial", capacityKw: 30, paymentType: "cash" },
    { kind: "VENDOR_NETWORK", lifecycle: "Completed", count: n(1), category: "industrial", capacityKw: 75, paymentType: "loan" },
    // vendorship_only
    { kind: "VENDORSHIP_ONLY", lifecycle: "In Progress", count: n(1), category: "commercial", capacityKw: 0, paymentType: "cash" },
    { kind: "VENDORSHIP_ONLY", lifecycle: "Completed", count: n(1), category: "commercial", capacityKw: 0, paymentType: "cash" },
    // INC_GIVEN
    { kind: "INC_GIVEN", lifecycle: "In Progress", count: n(1), category: "commercial", capacityKw: 12, paymentType: "cash" },
    { kind: "INC_GIVEN", lifecycle: "Completed", count: n(1), category: "residential", capacityKw: 5, paymentType: "cash" },
    // Edge-only
    { kind: "SOLO_EPC", lifecycle: "On Hold", count: 1, category: "residential", capacityKw: 5, paymentType: "cash", edgeTag: "on-hold-blockage" },
    { kind: "SOLO_EPC", lifecycle: "Closed", count: 1, category: "commercial", capacityKw: 10, paymentType: "cash", edgeTag: "closed-reopen" },
    { kind: "SOLO_EPC", lifecycle: "New", count: 1, category: "residential", capacityKw: 3, paymentType: "cash", edgeTag: "direct-exception" },
    { kind: "SOLO_EPC", lifecycle: "Completed", count: 1, category: "commercial", capacityKw: 15, paymentType: "cash", edgeTag: "archived-project" },
  ];
}

export function isDispatchCapable(kind: ProjectKind): boolean {
  return !["INC_GIVEN", "VENDORSHIP_ONLY", "OUTSOURCED_INC"].includes(kind);
}

export function allowsMaterialDispatch(kind: ProjectKind): boolean {
  if (kind === "INC") return false;
  return isDispatchCapable(kind);
}
