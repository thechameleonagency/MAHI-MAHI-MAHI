import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, Minus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRoleMatrix } from "@/contexts/RoleMatrixContext";
import { USER_ROLES, ROLE_LABELS, type UserRole } from "@/domain/entities/identity";
import type { Crud, Feature, FeaturePermissionMatrix } from "@/domain/policies/featurePermissions";

const CRUDS: Crud[] = ["view", "create", "edit", "delete"];
const CRUD_LETTERS: Record<Crud, string> = { view: "V", create: "C", edit: "E", delete: "D" };
const CRUD_LABELS: Record<Crud, string> = { view: "View", create: "Create", edit: "Edit", delete: "Delete" };

/**
 * Feature → human label + domain grouping (for readability).
 * Domains mirror the original Phase 3.2 plan structure.
 */
const FEATURE_DOMAINS: { domain: string; features: { key: Feature; label: string }[] }[] = [
  {
    domain: "Pipeline",
    features: [
      { key: "enquiry", label: "Enquiry" },
      { key: "customer", label: "Customer" },
      { key: "quotation", label: "Quotation" },
      { key: "quotationApprove", label: "Quotation — Approve" },
      { key: "agent", label: "Agent" },
      { key: "agentCommission", label: "Agent Commission Payment" },
    ],
  },
  {
    domain: "Operations — Project",
    features: [
      { key: "project", label: "Project" },
      { key: "projectDirectCreate", label: "Project — Direct Create (exception)" },
      { key: "projectCommercial", label: "Project — Commercial / Finance tab" },
      { key: "projectExecution", label: "Project — Execution / Tasks / Materials" },
      { key: "projectAudit", label: "Project — Audit tab" },
      { key: "site", label: "Site" },
      { key: "task", label: "Task" },
      { key: "siteVisit", label: "Site Visit" },
      { key: "scheduleInstallation", label: "Scheduled Installation" },
      { key: "materialReservation", label: "Material Reservation" },
      { key: "materialDamage", label: "Material Damage report" },
      { key: "blockage", label: "Blockage" },
    ],
  },
  {
    domain: "Operations — Inventory & Tools",
    features: [
      { key: "inventoryItem", label: "Inventory Item" },
      { key: "inventoryMovement", label: "Inventory Movement (issue/return/reverse)" },
      { key: "tool", label: "Tool" },
      { key: "toolMovement", label: "Tool Movement (issue/return/reverse)" },
    ],
  },
  {
    domain: "Finance",
    features: [
      { key: "financeHub", label: "Finance Hub (/finance route)" },
      { key: "invoice", label: "Invoice" },
      { key: "saleBill", label: "Sale Bill" },
      { key: "payment", label: "Payment" },
      { key: "expense", label: "Expense" },
      { key: "income", label: "Income" },
      { key: "vendor", label: "Vendor" },
      { key: "vendorBill", label: "Vendor Bill" },
      { key: "vendorPayment", label: "Vendor Payment" },
      { key: "partner", label: "Partner" },
      { key: "partnerTransaction", label: "Partner Transaction" },
      { key: "loan", label: "Loan" },
      { key: "loanRepayment", label: "Loan Repayment" },
    ],
  },
  {
    domain: "People",
    features: [
      { key: "employee", label: "Employee" },
      { key: "team", label: "Team" },
      { key: "attendance", label: "Attendance" },
      { key: "holiday", label: "Holiday" },
      { key: "payroll", label: "Payroll" },
      { key: "employeeWallet", label: "Employee Wallet (Advance / Recovery)" },
    ],
  },
  {
    domain: "Audit, Analytics & System",
    features: [
      { key: "auditPage", label: "Audit & Books pages" },
      { key: "analytics", label: "Analytics" },
      { key: "calendar", label: "Calendar" },
      { key: "timeline", label: "Timeline" },
      { key: "dashboard", label: "Dashboard" },
      { key: "notifications", label: "Notifications" },
    ],
  },
  {
    domain: "Settings",
    features: [
      { key: "settingsProfile", label: "Settings — Profile" },
      { key: "settingsCompany", label: "Settings — Company" },
      { key: "settingsTheme", label: "Settings — Theme" },
      { key: "settingsSecurity", label: "Settings — Security" },
      { key: "settingsTeam", label: "Settings — Team management" },
      { key: "settingsData", label: "Settings — Data reset" },
      { key: "settingsMasters", label: "Settings — Masters" },
      { key: "settingsRoleMatrix", label: "Settings — Role Matrix editor" },
      { key: "resetPrototype", label: "Reset prototype data" },
    ],
  },
];

/**
 * Read-only comprehensive view of the effective permission matrix:
 * every Feature × every Role × every CRUD verb.
 *
 * Differs from `RoleMatrixTab` (editable, override-aware): this is the *reference*
 * card, always showing the effective state after any localStorage override, for
 * audit / training / hand-off use. The Masters tab includes this at the top.
 *
 * super_admin column always shows ✓ (universal access shortcut).
 */
export function PermissionMatrixReference() {
  const { effectiveMatrix } = useRoleMatrix();
  const [search, setSearch] = useState("");

  const matrix = effectiveMatrix ?? ({} as FeaturePermissionMatrix);

  const filteredDomains = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return FEATURE_DOMAINS;
    return FEATURE_DOMAINS
      .map((d) => ({
        ...d,
        features: d.features.filter(
          (f) => f.label.toLowerCase().includes(q) || f.key.toLowerCase().includes(q),
        ),
      }))
      .filter((d) => d.features.length > 0);
  }, [search]);

  // Per-role count of features granted (for summary chip per role)
  const roleCounts = useMemo(() => {
    const counts: Record<UserRole, number> = {
      super_admin: 0, admin: 0, ceo: 0, management: 0, salesperson: 0, installation_team: 0,
    };
    USER_ROLES.forEach((role) => {
      if (role === "super_admin") {
        counts[role] = FEATURE_DOMAINS.reduce((s, d) => s + d.features.length, 0) * CRUDS.length;
        return;
      }
      FEATURE_DOMAINS.forEach((d) => {
        d.features.forEach((f) => {
          CRUDS.forEach((c) => {
            if (matrix[f.key]?.[c]?.includes(role)) counts[role] += 1;
          });
        });
      });
    });
    return counts;
  }, [matrix]);

  const totalCells = FEATURE_DOMAINS.reduce((s, d) => s + d.features.length, 0) * CRUDS.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Role × Feature × Access Matrix</CardTitle>
        <p className="text-xs text-muted-foreground">
          Read-only reference of the effective permission matrix. Edit in the
          <span className="mx-1 font-medium">Role Matrix</span>tab.
          ✓ = allowed · — = denied. <span className="font-mono">super_admin</span> has universal access.
        </p>
        <div className="flex items-center gap-2 pt-2">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search features…"
              className="h-8 pl-7 text-sm"
              aria-label="Search permissions"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {USER_ROLES.map((role) => (
              <Badge key={role} variant="outline" className="text-2xs">
                {ROLE_LABELS[role]}: {roleCounts[role]}/{totalCells}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-muted/40 sticky top-0">
              <tr>
                <th rowSpan={2} className="sticky left-0 bg-muted/40 px-3 py-2 text-left font-medium align-bottom min-w-[260px]">
                  Feature
                </th>
                {USER_ROLES.map((role) => (
                  <th key={role} colSpan={CRUDS.length} className="border-l border-border px-2 py-1.5 text-center font-medium">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
              <tr>
                {USER_ROLES.map((role) => (
                  CRUDS.map((c) => (
                    <th
                      key={`${role}-${c}`}
                      className="border-l border-border/40 px-1.5 py-1 text-center font-mono text-2xs text-muted-foreground"
                      title={CRUD_LABELS[c]}
                    >
                      {CRUD_LETTERS[c]}
                    </th>
                  ))
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDomains.map((domain) => (
                <FragmentDomain key={domain.domain} domain={domain.domain} features={domain.features} matrix={matrix} />
              ))}
              {filteredDomains.length === 0 && (
                <tr>
                  <td colSpan={1 + USER_ROLES.length * CRUDS.length} className="px-3 py-6 text-center text-muted-foreground">
                    No features match "{search}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function FragmentDomain({
  domain,
  features,
  matrix,
}: {
  domain: string;
  features: { key: Feature; label: string }[];
  matrix: FeaturePermissionMatrix;
}) {
  return (
    <>
      <tr className="bg-muted/20">
        <td colSpan={1 + USER_ROLES.length * CRUDS.length} className="sticky left-0 px-3 py-1.5 text-2xs font-semibold uppercase tracking-wider text-muted-foreground">
          {domain}
        </td>
      </tr>
      {features.map((f) => (
        <tr key={f.key} className="border-t hover:bg-muted/20">
          <td className="sticky left-0 bg-background px-3 py-1.5 font-medium align-top">
            {f.label}
            <div className="text-2xs font-mono text-muted-foreground">{f.key}</div>
          </td>
          {USER_ROLES.map((role) => (
            CRUDS.map((c) => {
              const isSuper = role === "super_admin";
              const allowed = isSuper || !!matrix[f.key]?.[c]?.includes(role);
              return (
                <td
                  key={`${f.key}-${role}-${c}`}
                  className={cn(
                    "border-l border-border/40 px-1.5 py-1.5 text-center align-middle",
                    allowed && "bg-success/10",
                  )}
                  title={`${ROLE_LABELS[role]} · ${CRUD_LABELS[c]} · ${allowed ? "Allowed" : "Denied"}`}
                >
                  {allowed ? (
                    <Check className="mx-auto h-3 w-3 text-success" aria-label="Allowed" />
                  ) : (
                    <Minus className="mx-auto h-3 w-3 text-muted-foreground/40" aria-label="Denied" />
                  )}
                </td>
              );
            })
          ))}
        </tr>
      ))}
    </>
  );
}
