import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatINR } from "@/lib/formatCurrency";
import { filterOpenWizardProjects } from "@/lib/createProjectWizardPrefill";
import { SearchableEntityList } from "@/components/projects/wizard/SourceStep";
import { listSubcontractorSelectOptions } from "@/lib/resolveSubcontractor";
import type { Partner, Subcontractor } from "@/types/finance";
import type { Project } from "@/types/project";
import type { CreateProjectWizardState } from "@/types/createProjectWizard";

export interface AttachPartiesStepCatalog {
  projects?: Project[];
  partners?: Partner[];
  subcontractors?: Subcontractor[];
}

export interface AttachPartiesStepProps {
  state: CreateProjectWizardState;
  onChange: (patch: Partial<CreateProjectWizardState>) => void;
  catalog?: AttachPartiesStepCatalog;
}

function buildSubcontractorOptions(catalog?: AttachPartiesStepCatalog) {
  return listSubcontractorSelectOptions({
    subcontractors: catalog?.subcontractors ?? [],
    partners: catalog?.partners ?? [],
  });
}

export function AttachPartiesStep({ state, onChange, catalog }: AttachPartiesStepProps) {
  const openProjects = useMemo(
    () => filterOpenWizardProjects(catalog?.projects ?? []),
    [catalog?.projects],
  );
  const subcontractors = useMemo(() => buildSubcontractorOptions(catalog), [catalog]);
  const attachTarget = openProjects.find((p) => p.id === state.attachToProjectId);

  return (
    <div className="space-y-6" data-testid="wizard-attach-parties-step">
      <div className="space-y-4">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Open project to attach
        </Label>
        <SearchableEntityList
          items={openProjects}
          selectedId={state.attachToProjectId}
          onSelect={(projectId) => onChange({ attachToProjectId: projectId })}
          searchPlaceholder="Search by project id, name, or client…"
          emptyMessage="No open projects available."
          testId="wizard-project-picker"
          filterItem={(p, query) =>
            [p.id, p.name, p.client, p.capacity]
              .filter(Boolean)
              .some((part) => String(part).toLowerCase().includes(query))
          }
          renderPrimary={(p) => `${p.id} — ${p.name}`}
          renderSecondary={(p) =>
            `${p.client} · ${p.capacity || "no capacity"} · ${formatINR(p.contractAmount || 0)}`
          }
        />
        {attachTarget && (
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/30 p-3 text-xs">
            <div>
              <span className="block text-muted-foreground">Client</span>
              <span className="font-medium">{attachTarget.client}</span>
            </div>
            <div>
              <span className="block text-muted-foreground">Capacity</span>
              <span className="font-medium">{attachTarget.capacity || "—"}</span>
            </div>
            <div>
              <span className="block text-muted-foreground">Location</span>
              <span className="font-medium">{attachTarget.location || "—"}</span>
            </div>
            <div>
              <span className="block text-muted-foreground">Contract</span>
              <span className="font-medium">{formatINR(attachTarget.contractAmount || 0)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Subcontractor
        </Label>
        <div className="space-y-2">
          <Label htmlFor="wizard-attach-subcontractor-select">
            Outsource to (subcontractor) <span className="text-destructive">*</span>
          </Label>
          <Select
            value={state.selectedSubcontractorId ?? ""}
            onValueChange={(value) => onChange({ selectedSubcontractorId: value })}
            disabled={!state.attachToProjectId}
          >
            <SelectTrigger id="wizard-attach-subcontractor-select" data-testid="wizard-subcontractor-select">
              <SelectValue placeholder="Select subcontractor partner…" />
            </SelectTrigger>
            <SelectContent>
              {subcontractors.map((row) => (
                <SelectItem key={row.id} value={row.id}>
                  {row.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {subcontractors.length === 0 && (
            <p className="text-xs text-muted-foreground">No subcontractors are configured yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AttachPartiesStep;
