import type { AppState } from "@/contexts/AppDataContext";
import type { SeedProfile } from "./seedLayerOrder";
import { seedId, SEED_ID_PREFIX } from "./seedIdRegistry";
import { seedDayAt } from "./seedTimeModel";
import {
  AGENT_NAMES, PARTNER_NAMES, VENDOR_NAMES, VENDORSHIP_COMPANIES, INC_GIVER_NAMES,
  phoneNumber, emailFor, addressAt,
} from "./seedNames";
import { countFor, pushAudit } from "./seedHelpers";

/** L2 — agents, partners, vendors, vendorship & INC giver companies. */
export function buildL2Network(state: AppState, profile: SeedProfile): AppState {
  const agentCount = countFor(profile, 10);
  state.agents = Array.from({ length: agentCount }, (_, i) => ({
    id: seedId(SEED_ID_PREFIX.agent),
    name: AGENT_NAMES[i % AGENT_NAMES.length],
    phone: phoneNumber(100 + i),
    email: emailFor(AGENT_NAMES[i % AGENT_NAMES.length]),
    address: addressAt(i).line,
    ratePerKw: 800 + (i % 5) * 200,
    rateType: i % 3 === 0 ? ("per-project" as const) : ("per-kw" as const),
    flatRate: i % 3 === 0 ? 15000 : undefined,
    status: i === agentCount - 1 ? ("inactive" as const) : ("active" as const),
    totalReferrals: 5 + i * 2,
    createdAt: seedDayAt(0.02 + i * 0.003),
  }));

  state.partners = PARTNER_NAMES.slice(0, countFor(profile, 8)).map((name, i) => ({
    id: seedId(SEED_ID_PREFIX.partner),
    name,
    phone: phoneNumber(200 + i),
    type: (["Profit-Share", "Fixed-Rate", "Channel", "Subcontractor"] as const)[i % 4],
    email: emailFor(name, "partners.in"),
    address: addressAt(i + 3).line,
    defaultRatePerKw: 3500 + i * 150,
    notes: i % 2 === 0 ? "Active Hyderabad territory" : undefined,
    createdAt: seedDayAt(0.03 + i * 0.004),
  }));

  state.vendors = VENDOR_NAMES.slice(0, countFor(profile, 12)).map((name, i) => ({
    id: seedId(SEED_ID_PREFIX.vendor),
    name,
    category: [
      ["Panels", "Inverters"],
      ["Structure", "Civil"],
      ["Cables", "Electrical"],
      ["Batteries"],
    ][i % 4],
    contact: phoneNumber(300 + i),
    email: emailFor(name, "vendors.in"),
    address: addressAt(i + 5).line,
    gstin: `36AABCV${String(1000 + i).slice(-4)}A1Z5`,
    outstandingAmount: i % 4 === 0 ? 45000 + i * 5000 : 0,
    purchaseHistory: [
      { date: seedDayAt(0.1 + i * 0.01), item: "Bulk supply", amount: 85000 + i * 10000 },
    ],
  }));

  state.vendorshipCompanies = VENDORSHIP_COMPANIES.slice(0, countFor(profile, 5)).map((name, i) => ({
    id: seedId(SEED_ID_PREFIX.vendorshipCo),
    name,
    phone: phoneNumber(400 + i),
    email: emailFor(name, "discom.in"),
    address: addressAt(i).line,
    registrationCode: `DISCOM-${String(100 + i)}`,
    notes: "Registered vendor code for net metering",
    createdAt: seedDayAt(0.04 + i * 0.005),
  }));

  state.incGiverCompanies = INC_GIVER_NAMES.slice(0, countFor(profile, 4)).map((name, i) => ({
    id: seedId(SEED_ID_PREFIX.incGiver),
    name,
    phone: phoneNumber(500 + i),
    email: emailFor(name, "inc.in"),
    address: addressAt(i + 2).line,
    notes: "INC work source — assigns installation scope",
    createdAt: seedDayAt(0.05 + i * 0.005),
  }));

  pushAudit(state, {
    action: "create",
    entityType: "Agent",
    entityId: state.agents[0]?.id ?? "",
    entityName: state.agents[0]?.name ?? "",
    fraction: 0.025,
    role: "salesperson",
  });
  pushAudit(state, {
    action: "create",
    entityType: "Partner",
    entityId: state.partners[0]?.id ?? "",
    entityName: state.partners[0]?.name ?? "",
    fraction: 0.026,
    role: "admin",
  });

  return state;
}
