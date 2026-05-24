import { useMemo } from "react";
import { Check, HardHat, User, Users, UsersRound } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PROJECT_KIND_UI_LABELS } from "@/lib/projectTaxonomyDisplay";
import { buildLeadPathSelectionResetPatch } from "@/lib/createProjectWizardPrefill";
import type { Partner } from "@/types/finance";
import type {
  CreateProjectWizardLeadPath,
  CreateProjectWizardPartnerType,
  CreateProjectWizardState,
} from "@/types/createProjectWizard";

export interface LeadPathStepCatalog {
  partners?: Partner[];
}

export interface LeadPathStepProps {
  state: CreateProjectWizardState;
  onChange: (patch: Partial<CreateProjectWizardState>) => void;
  catalog?: LeadPathStepCatalog;
}

const LEAD_PATH_OPTIONS: Array<{
  value: CreateProjectWizardLeadPath;
  icon: typeof User;
  title: string;
  description: string;
}> = [
  {
    value: "MSS_DIRECT",
    icon: User,
    title: "Direct Client",
    description: "We acquired this client directly",
  },
  {
    value: "PARTNER",
    icon: Users,
    title: "Partner Network",
    description: "A partner brought this deal to us",
  },
  {
    value: "INC_GIVEN",
    icon: HardHat,
    title: "INC Work Given to Us",
    description: "A company is giving us installation work",
  },
  {
    value: "OUTSOURCED_INC",
    icon: UsersRound,
    title: "Outsourced INC",
    description: "Subcontractor executes; MSS retains customer contract",
  },
];

const PARTNER_TYPE_OPTIONS: Array<{
  value: CreateProjectWizardPartnerType;
  title: string;
  description: string;
  kindLabel: string;
}> = [
  {
    value: "profit_share",
    title: "Profit Share",
    description: "Partner earns a % of profit after MSS costs",
    kindLabel: PROJECT_KIND_UI_LABELS.PARTNER_EPC,
  },
  {
    value: "fixed_rate",
    title: "Fixed Rate",
    description: "MSS earns fixed ₹/kW; partner keeps the rest",
    kindLabel: PROJECT_KIND_UI_LABELS.FIXED_EPC,
  },
  {
    value: "vendor_channel",
    title: "Vendor Channel",
    description: "External network or channel partner arrangement",
    kindLabel: PROJECT_KIND_UI_LABELS.VENDOR_NETWORK,
  },
  {
    value: "vendorship_only",
    title: "Vendorship Only",
    description: "Fee for DISCOM code usage without full EPC",
    kindLabel: PROJECT_KIND_UI_LABELS.VENDORSHIP_ONLY,
  },
];

function filterDealBringerPartners(partners: Partner[]): Partner[] {
  return partners.filter((p) => p.type === "Profit-Share" || p.type === "Fixed-Rate");
}

export function LeadPathStep({ state, onChange, catalog }: LeadPathStepProps) {
  const dealBringerPartners = useMemo(
    () => filterDealBringerPartners(catalog?.partners ?? []),
    [catalog?.partners],
  );

  const handleLeadPathChange = (leadPath: CreateProjectWizardLeadPath) => {
    onChange(buildLeadPathSelectionResetPatch(leadPath));
  };

  const handlePartnerTypeChange = (partnerType: CreateProjectWizardPartnerType) => {
    const patch: Partial<CreateProjectWizardState> = { partnerType };
    if (partnerType !== "profit_share" && partnerType !== "fixed_rate") {
      patch.selectedPartnerId = undefined;
    }
    onChange(patch);
  };

  const handlePartnerSelect = (partnerId: string) => {
    const partner = dealBringerPartners.find((p) => p.id === partnerId);
    const patch: Partial<CreateProjectWizardState> = { selectedPartnerId: partnerId };
    if (partner?.type === "Fixed-Rate") {
      patch.partnerType = "fixed_rate";
      if (partner.defaultRatePerKw != null) {
        patch.fixedRatePerKw = partner.defaultRatePerKw;
      }
    } else if (partner?.type === "Profit-Share") {
      patch.partnerType = "profit_share";
    }
    onChange(patch);
  };

  const showPartnerPicker =
    state.leadPath === "PARTNER" &&
    (state.partnerType === "profit_share" || state.partnerType === "fixed_rate");

  return (
    <div className="space-y-6" data-testid="wizard-lead-path-step">
      <div className="space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          How did this project come to us?
        </Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {LEAD_PATH_OPTIONS.map(({ value, icon: Icon, title, description }) => {
            const selected = state.leadPath === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => handleLeadPathChange(value)}
                data-testid={`wizard-lead-path-${value}`}
                className={cn(
                  "rounded-xl border-2 p-4 text-left transition-all",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40",
                )}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      selected ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                  <span className="text-sm font-semibold">{title}</span>
                  {selected && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground">{description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {state.leadPath === "PARTNER" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Partner network type
            </Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {PARTNER_TYPE_OPTIONS.map(({ value, title, description, kindLabel }) => {
                const selected = state.partnerType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handlePartnerTypeChange(value)}
                    data-testid={`wizard-partner-type-${value}`}
                    className={cn(
                      "rounded-xl border-2 p-3 text-left transition-all",
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-sm font-medium">{title}</span>
                      <Badge variant="outline" className="text-2xs">
                        {kindLabel}
                      </Badge>
                      {selected && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {showPartnerPicker && (
            <div className="space-y-2">
              <Label htmlFor="wizard-partner-select">Partner who brought this deal</Label>
              <Select value={state.selectedPartnerId ?? ""} onValueChange={handlePartnerSelect}>
                <SelectTrigger id="wizard-partner-select" data-testid="wizard-partner-select">
                  <SelectValue placeholder="Select partner…" />
                </SelectTrigger>
                <SelectContent>
                  {dealBringerPartners.map((partner) => (
                    <SelectItem key={partner.id} value={partner.id}>
                      <span>{partner.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {partner.type}
                      </Badge>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dealBringerPartners.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No profit-share or fixed-rate partners are configured yet.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {state.leadPath === "OUTSOURCED_INC" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="rounded-xl border border-warning bg-warning/5 p-4 dark:border-warning/20 dark:bg-warning/5">
            <h3 className="mb-2 text-sm font-semibold">How is this outsourcing recorded?</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                {
                  key: "new" as const,
                  title: "Create a fresh outsourced project",
                  sub: "Spin up a new project entity that tracks subcontractor work end-to-end.",
                },
                {
                  key: "existing" as const,
                  title: "Attach to existing project",
                  sub: "Use Source → Attach outsourced INC to record scope on an open project.",
                },
              ].map(({ key, title, sub }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onChange({ outsourceMode: key })}
                  data-testid={`wizard-outsource-mode-${key}`}
                  className={cn(
                    "rounded-lg border p-3 text-left text-sm transition",
                    state.outsourceMode === key
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <p className="font-medium">{title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
                </button>
              ))}
            </div>
          </div>
          {state.outsourceMode === "existing" && (
            <p className="text-sm text-muted-foreground" data-testid="wizard-outsource-existing-hint">
              Go back to the <span className="font-medium text-foreground">Source</span> step and choose{" "}
              <span className="font-medium text-foreground">Attach outsourced INC</span> to pick an open project
              and record subcontract details without creating a new project.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default LeadPathStep;
