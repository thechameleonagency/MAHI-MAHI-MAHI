/**
 * Phase 3 — featurePermissions invariants.
 *
 * Asserts:
 *  - Every Feature has every Crud verb defined (no `undefined` cells).
 *  - super_admin always wins regardless of matrix contents.
 *  - Salesperson + installation_team have the expected scoped access.
 *  - Override merging preserves untouched feature rows.
 */
import { describe, expect, it } from "vitest";
import {
  buildFeaturePermissionMatrixDraft,
  cloneFeaturePermissionMatrix,
  DEFAULT_FEATURE_PERMISSIONS,
  canFeature,
  featureFlags,
  isFeature,
  type Feature,
  type FeaturePermissionMatrix,
} from "@/domain/policies/featurePermissions";

const FEATURES = Object.keys(DEFAULT_FEATURE_PERMISSIONS) as Feature[];
const CRUDS = ["view", "create", "edit", "delete"] as const;

describe("featurePermissions — default matrix shape", () => {
  it("every feature has every CRUD verb defined as an array", () => {
    for (const feature of FEATURES) {
      const row = DEFAULT_FEATURE_PERMISSIONS[feature];
      expect(row, `${feature} row missing`).toBeDefined();
      for (const crud of CRUDS) {
        expect(Array.isArray(row[crud]), `${feature}.${crud} must be an array`).toBe(true);
      }
    }
  });

  it("no role appears twice in any cell", () => {
    for (const feature of FEATURES) {
      for (const crud of CRUDS) {
        const roles = DEFAULT_FEATURE_PERMISSIONS[feature][crud];
        expect(new Set(roles).size).toBe(roles.length);
      }
    }
  });

  it("isFeature recognises valid feature names", () => {
    expect(isFeature("invoice")).toBe(true);
    expect(isFeature("not-a-feature")).toBe(false);
  });
});

describe("canFeature — super_admin universal access", () => {
  it("super_admin can do every CRUD on every feature", () => {
    for (const feature of FEATURES) {
      for (const crud of CRUDS) {
        expect(canFeature("super_admin", feature, crud)).toBe(true);
      }
    }
  });

  it("super_admin ignores empty override rows", () => {
    const override: Partial<FeaturePermissionMatrix> = {
      invoice: { view: [], create: [], edit: [], delete: [] },
    };
    expect(canFeature("super_admin", "invoice", "delete", override)).toBe(true);
  });
});

describe("canFeature — salesperson scope", () => {
  it("can view + create + edit pipeline (enquiry/quotation/customer/agent)", () => {
    expect(canFeature("salesperson", "enquiry", "view")).toBe(true);
    expect(canFeature("salesperson", "enquiry", "create")).toBe(true);
    expect(canFeature("salesperson", "enquiry", "edit")).toBe(true);
    expect(canFeature("salesperson", "quotation", "create")).toBe(true);
    expect(canFeature("salesperson", "customer", "view")).toBe(true);
    expect(canFeature("salesperson", "agent", "view")).toBe(true);
  });

  it("cannot delete pipeline entities", () => {
    expect(canFeature("salesperson", "enquiry", "delete")).toBe(false);
    expect(canFeature("salesperson", "quotation", "delete")).toBe(false);
    expect(canFeature("salesperson", "customer", "delete")).toBe(false);
    expect(canFeature("salesperson", "agent", "delete")).toBe(false);
  });

  it("can view templates but not create or delete them", () => {
    expect(canFeature("salesperson", "template", "view")).toBe(true);
    expect(canFeature("salesperson", "template", "create")).toBe(false);
    expect(canFeature("salesperson", "template", "delete")).toBe(false);
  });

  it("can view materials catalog but not tools or field-ops surfaces", () => {
    expect(canFeature("salesperson", "inventoryItem", "view")).toBe(true);
    expect(canFeature("salesperson", "tool", "view")).toBe(false);
    expect(canFeature("salesperson", "task", "view")).toBe(false);
  });

  it("cannot open finance hub or finance modules", () => {
    expect(canFeature("salesperson", "financeHub", "view")).toBe(false);
    expect(canFeature("salesperson", "invoice", "view")).toBe(false);
    expect(canFeature("salesperson", "expense", "view")).toBe(false);
  });

  it("cannot touch finance / commercial projects / audit", () => {
    expect(canFeature("salesperson", "invoice", "view")).toBe(false);
    expect(canFeature("salesperson", "payment", "create")).toBe(false);
    expect(canFeature("salesperson", "projectCommercial", "view")).toBe(false);
    expect(canFeature("salesperson", "auditPage", "view")).toBe(false);
    expect(canFeature("salesperson", "analytics", "view")).toBe(false);
    expect(canFeature("salesperson", "settingsMasters", "view")).toBe(false);
  });
});

describe("canFeature — installation_team scope", () => {
  it("can view + work execution surfaces (project execution, tasks, site visits, materials issue)", () => {
    expect(canFeature("installation_team", "projectExecution", "view")).toBe(true);
    expect(canFeature("installation_team", "projectExecution", "edit")).toBe(true);
    expect(canFeature("installation_team", "task", "view")).toBe(true);
    expect(canFeature("installation_team", "task", "create")).toBe(true);
    expect(canFeature("installation_team", "task", "edit")).toBe(true);
    expect(canFeature("installation_team", "siteVisit", "create")).toBe(true);
    expect(canFeature("installation_team", "scheduleInstallation", "create")).toBe(true);
    expect(canFeature("installation_team", "inventoryItem", "view")).toBe(true);
    expect(canFeature("installation_team", "inventoryMovement", "create")).toBe(true);
    expect(canFeature("installation_team", "tool", "view")).toBe(true);
    expect(canFeature("installation_team", "toolMovement", "create")).toBe(true);
    expect(canFeature("installation_team", "blockage", "create")).toBe(true);
    expect(canFeature("installation_team", "calendar", "view")).toBe(true);
    expect(canFeature("installation_team", "timeline", "view")).toBe(true);
  });

  it("cannot see commercial / finance / audit / analytics / settings master", () => {
    expect(canFeature("installation_team", "projectCommercial", "view")).toBe(false);
    expect(canFeature("installation_team", "projectAudit", "view")).toBe(false);
    expect(canFeature("installation_team", "invoice", "view")).toBe(false);
    expect(canFeature("installation_team", "payment", "view")).toBe(false);
    expect(canFeature("installation_team", "vendor", "view")).toBe(false);
    expect(canFeature("installation_team", "partner", "view")).toBe(false);
    expect(canFeature("installation_team", "loan", "view")).toBe(false);
    expect(canFeature("installation_team", "auditPage", "view")).toBe(false);
    expect(canFeature("installation_team", "analytics", "view")).toBe(false);
    expect(canFeature("installation_team", "settingsMasters", "view")).toBe(false);
  });

  it("cannot view or mutate BOM templates (sales / management only)", () => {
    expect(canFeature("installation_team", "template", "view")).toBe(false);
    expect(canFeature("installation_team", "template", "create")).toBe(false);
    expect(canFeature("installation_team", "template", "delete")).toBe(false);
  });

  it("cannot create or edit inventory items themselves (only movements)", () => {
    expect(canFeature("installation_team", "inventoryItem", "create")).toBe(false);
    expect(canFeature("installation_team", "inventoryItem", "edit")).toBe(false);
    expect(canFeature("installation_team", "tool", "create")).toBe(false);
    expect(canFeature("installation_team", "tool", "edit")).toBe(false);
  });
});

describe("canFeature — CEO read-only-plus-Analytics", () => {
  it("can open finance hub and view finance modules read-only", () => {
    expect(canFeature("ceo", "financeHub", "view")).toBe(true);
    expect(canFeature("ceo", "expense", "view")).toBe(true);
    expect(canFeature("ceo", "expense", "create")).toBe(false);
  });

  it("can view operations + finance + audit + analytics", () => {
    expect(canFeature("ceo", "project", "view")).toBe(true);
    expect(canFeature("ceo", "invoice", "view")).toBe(true);
    expect(canFeature("ceo", "auditPage", "view")).toBe(true);
    expect(canFeature("ceo", "analytics", "view")).toBe(true);
  });

  it("cannot edit operations or finance day-to-day", () => {
    expect(canFeature("ceo", "task", "create")).toBe(false);
    expect(canFeature("ceo", "invoice", "create")).toBe(false);
    expect(canFeature("ceo", "vendor", "edit")).toBe(false);
    expect(canFeature("ceo", "loan", "create")).toBe(false);
  });

  it("can approve quotation→project transition", () => {
    expect(canFeature("ceo", "quotation", "create")).toBe(false); // does not create
    // approval mapping handled by quotationStateMachine; CEO appears on quotation view.
  });
});

describe("canFeature — admin vs management", () => {
  it("management cannot delete invoices / payments / expenses / income / loans / partners", () => {
    expect(canFeature("management", "invoice", "delete")).toBe(false);
    expect(canFeature("management", "payment", "delete")).toBe(false);
    expect(canFeature("management", "expense", "delete")).toBe(false);
    expect(canFeature("management", "income", "delete")).toBe(false);
    expect(canFeature("management", "loan", "delete")).toBe(false);
    expect(canFeature("management", "partner", "delete")).toBe(false);
  });

  it("admin can delete those", () => {
    expect(canFeature("admin", "payment", "delete")).toBe(true);
    expect(canFeature("admin", "expense", "delete")).toBe(true);
    expect(canFeature("admin", "loan", "delete")).toBe(true);
    expect(canFeature("admin", "partner", "delete")).toBe(true);
  });

  it("invoice delete is blocked for everyone (void instead)", () => {
    expect(canFeature("admin", "invoice", "delete")).toBe(false);
    expect(canFeature("management", "invoice", "delete")).toBe(false);
    expect(canFeature("super_admin", "invoice", "delete")).toBe(true); // super_admin bypass
  });
});

describe("canFeature — super_admin-only features", () => {
  it("settingsRoleMatrix is locked to super_admin", () => {
    for (const role of ["admin", "ceo", "management", "salesperson", "installation_team"] as const) {
      expect(canFeature(role, "settingsRoleMatrix", "view")).toBe(false);
    }
    expect(canFeature("super_admin", "settingsRoleMatrix", "view")).toBe(true);
  });

  it("resetPrototype is locked to super_admin", () => {
    for (const role of ["admin", "ceo", "management"] as const) {
      expect(canFeature(role, "resetPrototype", "view")).toBe(false);
    }
    expect(canFeature("super_admin", "resetPrototype", "view")).toBe(true);
  });

  it("employeeWallet: admin/management create; CEO view-only; expense create is separate", () => {
    expect(canFeature("admin", "employeeWallet", "create")).toBe(true);
    expect(canFeature("management", "employeeWallet", "create")).toBe(true);
    expect(canFeature("ceo", "employeeWallet", "view")).toBe(true);
    expect(canFeature("ceo", "employeeWallet", "create")).toBe(false);
    expect(canFeature("salesperson", "employeeWallet", "view")).toBe(false);
    expect(canFeature("installation_team", "employeeWallet", "view")).toBe(false);
    expect(canFeature("admin", "expense", "create")).toBe(true);
    expect(canFeature("super_admin", "employeeWallet", "create")).toBe(true);
  });
});

describe("featureFlags helper", () => {
  it("returns all four predicates", () => {
    const flags = featureFlags("admin", "invoice");
    expect(flags.view).toBe(true);
    expect(flags.create).toBe(true);
    expect(flags.edit).toBe(true);
    expect(flags.delete).toBe(false); // invoice delete blocked
  });
});

describe("canFeature — override merging", () => {
  it("override row replaces default row", () => {
    const override: Partial<FeaturePermissionMatrix> = {
      invoice: { view: ["salesperson"], create: [], edit: [], delete: [] },
    };
    expect(canFeature("salesperson", "invoice", "view", override)).toBe(true);
    // default says salesperson cannot view invoice; override flips it on
  });

  it("untouched features fall back to defaults", () => {
    const override: Partial<FeaturePermissionMatrix> = {
      invoice: { view: [], create: [], edit: [], delete: [] },
    };
    // payment row not in override → uses default
    expect(canFeature("admin", "payment", "view", override)).toBe(true);
  });
});

describe("feature permission matrix cloning (Mn21)", () => {
  it("cloneFeaturePermissionMatrix does not alias DEFAULT_FEATURE_PERMISSIONS", () => {
    const draft = cloneFeaturePermissionMatrix();
    draft.enquiry.view = [...draft.enquiry.view, "installation_team"];
    expect(DEFAULT_FEATURE_PERMISSIONS.enquiry.view).not.toContain("installation_team");
  });

  it("buildFeaturePermissionMatrixDraft merges override rows without aliasing", () => {
    const override: Partial<FeaturePermissionMatrix> = {
      invoice: { view: ["salesperson"], create: [], edit: [], delete: [] },
    };
    const draft = buildFeaturePermissionMatrixDraft(override);
    expect(draft.invoice.view).toEqual(["salesperson"]);
    draft.invoice.view.push("installation_team");
    expect(override.invoice!.view).toEqual(["salesperson"]);
    expect(DEFAULT_FEATURE_PERMISSIONS.invoice.view).not.toContain("installation_team");
  });
});
