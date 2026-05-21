/**
 * MO2 — canonical mobile vs desktop-first data-entry posture for demos and UI copy.
 * Prototype scope: mobile is optimized for approvals and lookups; heavy grids stay on desktop.
 */

export type MobilePostureTier = "mobile_ok" | "desktop_first";

export type MobilePostureModule = {
  id: string;
  label: string;
  routes: readonly string[];
  tier: MobilePostureTier;
  mobileNotes: string;
  desktopNotes?: string;
};

/** Per-module posture (audit MO2). */
export const MOBILE_POSTURE_MODULES: readonly MobilePostureModule[] = [
  {
    id: "dashboard",
    label: "Dashboard & global search",
    routes: ["/", "/notifications"],
    tier: "mobile_ok",
    mobileNotes: "KPI strips, alert list, dismiss/restore; global search sheet (MR6).",
  },
  {
    id: "approvals",
    label: "Approvals & queues",
    routes: ["/notifications", "/settings"],
    tier: "mobile_ok",
    mobileNotes:
      "Business alerts, Settings → Deletion queue (PR2), Finance accounting review dismiss/retry (EC1).",
    desktopNotes: "Long audit grids and bank recon remain desktop-first.",
  },
  {
    id: "projects_lookup",
    label: "Projects & sites (read / light actions)",
    routes: ["/projects", "/active-sites", "/timeline", "/calendar"],
    tier: "mobile_ok",
    mobileNotes: "List filters, project header KPIs, lifecycle banners, task status on Employee profile.",
    desktopNotes: "BOQ edit, material dispatch grids, document studio bulk work.",
  },
  {
    id: "progress_report_field",
    label: "Progress Report — field & approvals",
    routes: ["/projects"],
    tier: "mobile_ok",
    mobileNotes:
      "MO1: mobile stage picker, sub-items expanded, timeline steps; approve/reject requested work (management).",
    desktopNotes: "Photo assignment modal and multi-file media upload (see progress_media).",
  },
  {
    id: "progress_media",
    label: "Progress Report — photo / video capture",
    routes: ["/projects"],
    tier: "desktop_first",
    mobileNotes: "Can mark stages requested; attaching many images/videos is cramped on small viewports.",
    desktopNotes: "Use Assign photo task or Upload photos directly on desktop width.",
  },
  {
    id: "crm_lookup",
    label: "Enquiries & customers (lookup)",
    routes: ["/enquiries", "/customers"],
    tier: "mobile_ok",
    mobileNotes: "Pipeline lists, detail read, assignee chips, share trails.",
    desktopNotes: "Multi-line enquiry forms and revision chains.",
  },
  {
    id: "quotations",
    label: "Quotations (authoring)",
    routes: ["/quotations"],
    tier: "desktop_first",
    mobileNotes: "Read-only OK; line-item grids and template editors need horizontal space.",
    desktopNotes: "Create/revise quotations, visibility presets, PDF preview.",
  },
  {
    id: "invoices",
    label: "Invoices & finance line items",
    routes: ["/invoices", "/finance"],
    tier: "desktop_first",
    mobileNotes: "UX3 adds stacked line cards on narrow screens, but authoring is still desktop-first.",
    desktopNotes: "Invoice create sheet, CPR allocation, vendor bill lines, owner capital forms.",
  },
  {
    id: "inventory",
    label: "Inventory & procurement grids",
    routes: ["/inventory/materials", "/inventory/tools", "/inventory/templates"],
    tier: "desktop_first",
    mobileNotes: "Stock lookup works; bulk issue/return/procurement lines are table-heavy.",
  },
  {
    id: "hr",
    label: "Attendance & payroll tables",
    routes: ["/attendance", "/hr"],
    tier: "desktop_first",
    mobileNotes: "Single-day edits possible; roster and payroll release grids are desktop-first.",
  },
  {
    id: "audit",
    label: "Audit & books",
    routes: ["/audit"],
    tier: "desktop_first",
    mobileNotes: "Training alerts readable; voucher/ledger tables need desktop width.",
  },
] as const;

export type MobileDemoWalkthroughStep = {
  phase: "mobile" | "desktop";
  order: number;
  personaRole: string;
  title: string;
  actions: readonly string[];
  routes: readonly string[];
};

/** Scripted customer demo — MO2 acceptance path. */
export const MOBILE_DEMO_WALKTHROUGH: readonly MobileDemoWalkthroughStep[] = [
  {
    phase: "mobile",
    order: 1,
    personaRole: "management",
    title: "Approvals on phone",
    actions: [
      "Narrow viewport (~375px) or phone",
      "Open Notifications → review alert → dismiss or follow link",
      "Open project with pending work-status → Progress Report → Approve requested stage",
      "Settings → Deletion queue → approve/reject pending item",
    ],
    routes: ["/notifications", "/projects", "/settings"],
  },
  {
    phase: "mobile",
    order: 2,
    personaRole: "installation_team",
    title: "Field lookups & light updates",
    actions: [
      "Global search → jump to assigned project",
      "Progress Report → mobile stage picker → view sub-items",
      "Employees → your profile → Tasks → set photo task to Done",
      "Do not bulk-upload gallery photos on mobile (desktop step below)",
    ],
    routes: ["/", "/projects", "/employees"],
  },
  {
    phase: "desktop",
    order: 3,
    personaRole: "admin",
    title: "Heavy authoring (quotation + invoice)",
    actions: [
      "Desktop width (≥1024px)",
      "Quotations → create/revise with line items and services",
      "Invoices → create from project context with line grid",
      "Finance → record payment / CPR when needed",
    ],
    routes: ["/quotations", "/invoices", "/finance"],
  },
  {
    phase: "desktop",
    order: 4,
    personaRole: "admin",
    title: "Progress media & field-install demo",
    actions: [
      "Project [Demo] Field install — panel photos → assign photo task (desktop)",
      "Field persona marks task Done on mobile; upload media on desktop Progress Report",
      "Management approves and closes stage (either form factor)",
      "See fieldInstallationDemoPath.ts for automated proof",
    ],
    routes: ["/projects"],
  },
] as const;

export const MOBILE_POSTURE_SUMMARY =
  "Mobile: approvals, alerts, lookups, and light field status updates. Desktop: quotation/invoice line grids, finance authoring, progress photo/video upload, inventory and audit tables.";

export const MOBILE_POSTURE_PROTOTYPE_DISCLAIMER =
  "This is a prototype posture, not a device capability limit — layouts may improve later; demos should not promise full authoring on phone.";

/** Longest-prefix match for route posture hints (navbar / guards). */
export function routePostureForPath(pathname: string): MobilePostureTier {
  const path = pathname.split("?")[0] ?? pathname;
  let tier: MobilePostureTier = "mobile_ok";
  let bestLen = 0;
  for (const mod of MOBILE_POSTURE_MODULES) {
    for (const route of mod.routes) {
      if (path === route || path.startsWith(`${route}/`)) {
        if (route.length > bestLen) {
          bestLen = route.length;
          tier = mod.tier;
        }
      }
    }
  }
  return tier;
}

export function modulesForTier(tier: MobilePostureTier): MobilePostureModule[] {
  return MOBILE_POSTURE_MODULES.filter((m) => m.tier === tier);
}

export function isDesktopFirstPath(pathname: string): boolean {
  return routePostureForPath(pathname) === "desktop_first";
}

export function walkthroughStepsForPhase(phase: MobileDemoWalkthroughStep["phase"]): MobileDemoWalkthroughStep[] {
  return MOBILE_DEMO_WALKTHROUGH.filter((s) => s.phase === phase).sort((a, b) => a.order - b.order);
}
