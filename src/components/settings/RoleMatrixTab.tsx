import { useMemo, useState } from "react";
import {
  buildFeaturePermissionMatrixDraft,
  cloneFeaturePermissionMatrix,
  DEFAULT_FEATURE_PERMISSIONS,
  FEATURE_MATRIX_ROW_NOTES,
  type Crud,
  type Feature,
  type FeaturePermissionMatrix,
} from "@/domain/policies/featurePermissions";
import { useRoleMatrix } from "@/contexts/RoleMatrixContext";
import { ROLE_LABELS, USER_ROLES, type UserRole } from "@/domain/entities/identity";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertCircle, Download, RotateCcw } from "lucide-react";
import { downloadCSV } from "@/lib/csvExport";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { AUDIT_FEATURE_LABELS, AUDIT_VIEW_FEATURES } from "@/lib/auditRouteFeatures";

const CRUDS: Crud[] = ["view", "create", "edit", "delete"];

const DOMAIN_GROUPS: { id: string; label: string; features: Feature[] }[] = [
  {
    id: "pipeline",
    label: "Pipeline",
    features: ["enquiry", "customer", "quotation", "quotationApprove", "agent", "agentCommission"],
  },
  {
    id: "operations",
    label: "Operations",
    features: [
      "project",
      "projectDirectCreate",
      "projectCommercial",
      "projectExecution",
      "projectAudit",
      "site",
      "task",
      "siteVisit",
      "scheduleInstallation",
      "materialReservation",
      "materialDamage",
      "blockage",
      "inventoryItem",
      "inventoryMovement",
      "tool",
      "toolMovement",
      "template",
    ],
  },
  {
    id: "finance",
    label: "Finance",
    features: [
      "financeHub",
      "invoice",
      "saleBill",
      "payment",
      "expense",
      "income",
      "vendor",
      "vendorBill",
      "vendorPayment",
      "partner",
      "partnerTransaction",
      "loan",
      "loanRepayment",
    ],
  },
  {
    id: "people",
    label: "People",
    features: ["employee", "team", "attendance", "holiday", "payroll", "employeeWallet"],
  },
  {
    id: "audit",
    label: "Audit & Books (per page)",
    features: [...AUDIT_VIEW_FEATURES],
  },
  {
    id: "system",
    label: "System & Pages",
    features: [
      "analytics",
      "calendar",
      "timeline",
      "dashboard",
      "notifications",
      "settingsProfile",
      "settingsCompany",
      "settingsTheme",
      "settingsSecurity",
      "settingsTeam",
      "settingsData",
      "settingsMasters",
      "settingsRoleMatrix",
      "resetPrototype",
    ],
  },
];

const FEATURE_LABELS: Partial<Record<Feature, string>> = {
  enquiry: "Enquiry",
  customer: "Customer",
  quotation: "Quotation",
  quotationApprove: "Quotation — approve",
  agent: "Agent",
  agentCommission: "Agent commission",
  project: "Project",
  projectDirectCreate: "Project — direct exception",
  projectCommercial: "Project commercial / finance tab",
  projectExecution: "Project execution / tasks tab",
  projectAudit: "Project audit tab",
  site: "Site record",
  task: "Task",
  siteVisit: "Site visit",
  scheduleInstallation: "Scheduled installation",
  materialReservation: "Material reservation",
  materialDamage: "Material damage",
  blockage: "Blockage",
  inventoryItem: "Inventory item",
  inventoryMovement: "Inventory movement (issue/return/reverse)",
  tool: "Tool",
  toolMovement: "Tool movement (issue/return/reverse)",
  template: "Quotation / site checklist templates",
  financeHub: "Finance Hub (/finance)",
  invoice: "Invoice",
  saleBill: "Sale bill",
  payment: "Payment",
  expense: "Expense",
  income: "Income",
  vendor: "Vendor",
  vendorBill: "Vendor bill",
  vendorPayment: "Vendor payment",
  partner: "Partner",
  partnerTransaction: "Partner transaction",
  loan: "Loan",
  loanRepayment: "Loan repayment",
  employee: "Employee",
  team: "Team",
  attendance: "Attendance",
  holiday: "Holiday",
  payroll: "Payroll",
  employeeWallet: "Employee wallet (advances)",
  ...AUDIT_FEATURE_LABELS,
  analytics: "Analytics",
  calendar: "Calendar",
  timeline: "Timeline",
  dashboard: "Dashboard",
  notifications: "Notifications",
  settingsProfile: "Settings — Profile",
  settingsCompany: "Settings — Company",
  settingsTheme: "Settings — Theme",
  settingsSecurity: "Settings — Security",
  settingsTeam: "Settings — Team management",
  settingsData: "Settings — Data reset",
  settingsMasters: "Settings — Masters",
  settingsRoleMatrix: "Settings — Role matrix",
  resetPrototype: "Reset prototype data",
};

const NON_SUPER_ROLES: UserRole[] = USER_ROLES.filter((r) => r !== "super_admin") as UserRole[];

/**
 * Phase 4 — Role Matrix editor (sub-tab B of Settings → Masters).
 *
 * Super-admin-only. Edits the `FeaturePermissionMatrix` override persisted under
 * `mss.roleMatrix.v1`. Clearing the override restores defaults.
 */
export function RoleMatrixTab() {
  const { override, hasOverride, saveOverride, resetToDefaults } = useRoleMatrix();

  const initialDraft = useMemo(
    () => buildFeaturePermissionMatrixDraft(override),
    [override],
  );

  const [draft, setDraft] = useState<FeaturePermissionMatrix>(initialDraft);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const toggleCell = (feature: Feature, crud: Crud, role: UserRole, on: boolean) => {
    setDraft((prev) => {
      const next = { ...prev };
      const row = { ...next[feature] };
      const list = new Set(row[crud]);
      if (on) list.add(role);
      else list.delete(role);
      row[crud] = Array.from(list);
      next[feature] = row;
      return next;
    });
  };

  const handleSave = () => {
    // Compute a diff against defaults — only persist rows that differ.
    const diff: Partial<FeaturePermissionMatrix> = {};
    for (const feature of Object.keys(draft) as Feature[]) {
      const drow = draft[feature];
      const def = DEFAULT_FEATURE_PERMISSIONS[feature];
      const differs = CRUDS.some((c) => {
        const a = [...drow[c]].sort();
        const b = [...def[c]].sort();
        return a.length !== b.length || a.some((v, i) => v !== b[i]);
      });
      if (differs) diff[feature] = drow;
    }
    if (Object.keys(diff).length === 0) {
      saveOverride(undefined);
      toast({ title: "Defaults restored", description: "No diff vs defaults — override cleared." });
      return;
    }
    saveOverride(diff);
    toast({
      title: "Role matrix saved",
      description: `${Object.keys(diff).length} feature row(s) overridden — effective immediately.`,
    });
  };

  const handleReset = () => {
    resetToDefaults();
    setDraft(cloneFeaturePermissionMatrix());
    toast({ title: "Reset to defaults", description: "All custom permissions cleared." });
  };

  const handleExport = () => {
    const rows: { feature: string; crud: string; roles: string }[] = [];
    for (const feature of Object.keys(draft) as Feature[]) {
      for (const crud of CRUDS) {
        rows.push({ feature, crud, roles: draft[feature][crud].join("|") });
      }
    }
    downloadCSV("role-matrix.csv", rows, ["feature", "crud", "roles"]);
  };

  const toggleGroup = (id: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <p className="font-medium text-foreground">Effective permissions</p>
            <p className="text-xs">
              Saved matrix changes apply to <code className="text-xs">useCan</code>-gated buttons and to route access
              (sidebar, pins, deep links) via each page&apos;s <strong>View</strong> column. Audit &amp; Books has one row
              per <code className="text-xs">/audit/*</code> route — e.g. Profit &amp; loss vs Cash &amp; bank are independent.
              Action verbs (Create / Edit / Delete) gate commands and forms.
            </p>
          </div>
        </div>

        {hasOverride && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning p-3 text-sm text-warning dark:bg-warning/30 dark:text-warning">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <div>
              <p className="font-medium">Custom permissions active</p>
              <p className="text-xs">
                {Object.keys(override ?? {}).length} feature row(s) override the defaults. Reset to revert.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {DOMAIN_GROUPS.map((group) => {
            const collapsed = collapsedGroups.has(group.id);
            return (
              <Card key={group.id}>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <button
                      type="button"
                      className="text-base font-semibold hover:underline"
                      onClick={() => toggleGroup(group.id)}
                      aria-expanded={!collapsed}
                    >
                      {group.label}
                    </button>
                    <Badge variant="outline" className="text-2xs">
                      {group.features.length} features
                    </Badge>
                  </div>
                  {!collapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                            <th className="sticky left-0 z-10 bg-card py-2 pr-3 text-left">Feature</th>
                            {NON_SUPER_ROLES.map((role) => (
                              <th key={role} className="px-2 py-2 text-center">
                                <div className="text-2xs">{ROLE_LABELS[role]}</div>
                                <div className="mt-1 flex justify-center gap-1.5 text-2xs text-muted-foreground">
                                  <span title="View">V</span>
                                  <span title="Create">C</span>
                                  <span title="Edit">E</span>
                                  <span title="Delete">D</span>
                                </div>
                              </th>
                            ))}
                            <th className="px-2 py-2 text-center">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-2xs">Super</span>
                                </TooltipTrigger>
                                <TooltipContent>Super admin always has full access</TooltipContent>
                              </Tooltip>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.features.map((feature) => (
                            <tr key={feature} className="border-b border-border/50">
                              <td className="sticky left-0 z-10 bg-card py-2 pr-3">
                                <div className="font-medium">{FEATURE_LABELS[feature] ?? feature}</div>
                                <div className="text-2xs font-mono text-muted-foreground">{feature}</div>
                                {FEATURE_MATRIX_ROW_NOTES[feature] && (
                                  <p className="mt-1 max-w-[220px] text-2xs font-normal leading-snug text-muted-foreground">
                                    {FEATURE_MATRIX_ROW_NOTES[feature]}
                                  </p>
                                )}
                              </td>
                              {NON_SUPER_ROLES.map((role) => (
                                <td key={role} className="px-2 py-2">
                                  <div className="flex justify-center gap-1.5">
                                    {CRUDS.map((crud) => {
                                      const checked = draft[feature][crud].includes(role);
                                      return (
                                        <Checkbox
                                          key={crud}
                                          checked={checked}
                                          onCheckedChange={(v) => toggleCell(feature, crud, role, v === true)}
                                          aria-label={`${role} can ${crud} ${feature}`}
                                          className={cn("h-4 w-4")}
                                        />
                                      );
                                    })}
                                  </div>
                                </td>
                              ))}
                              <td className="px-2 py-2">
                                <div className="flex justify-center gap-1.5 opacity-60">
                                  {CRUDS.map((crud) => (
                                    <Checkbox key={crud} checked disabled aria-label="Super admin always allowed" className="h-4 w-4" />
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={!hasOverride}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset to defaults
          </Button>
          <Button onClick={handleSave}>Save changes</Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
