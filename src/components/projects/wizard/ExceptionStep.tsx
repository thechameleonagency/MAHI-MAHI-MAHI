import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_KINDS, type ProjectKind } from "@/domain/projectTypes/types";
import { PROJECT_KIND_UI_LABELS } from "@/lib/projectTaxonomyDisplay";
import { LeadPathStep, type LeadPathStepCatalog } from "@/components/projects/wizard/LeadPathStep";
import type { CreateProjectWizardState } from "@/types/createProjectWizard";

export interface ExceptionStepCatalog extends LeadPathStepCatalog {}

export interface ExceptionStepProps {
  state: CreateProjectWizardState;
  onChange: (patch: Partial<CreateProjectWizardState>) => void;
  catalog?: ExceptionStepCatalog;
}

export function ExceptionStep({ state, onChange, catalog }: ExceptionStepProps) {
  return (
    <div className="space-y-6" data-testid="wizard-exception-step">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="wizard-direct-exception-reason">Reason (audit trail)</Label>
          <Textarea
            id="wizard-direct-exception-reason"
            value={state.directExceptionReason ?? ""}
            onChange={(e) => onChange({ directExceptionReason: e.target.value })}
            rows={3}
            placeholder="Why is this project being created without a quotation?"
            data-testid="wizard-direct-exception-reason"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wizard-direct-exception-kind">Deal kind</Label>
          <Select
            value={state.directExceptionProjectKind ?? ""}
            onValueChange={(value) =>
              onChange({ directExceptionProjectKind: value as ProjectKind })
            }
          >
            <SelectTrigger id="wizard-direct-exception-kind" data-testid="wizard-direct-exception-kind">
              <SelectValue placeholder="Select project kind…" />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_KINDS.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {PROJECT_KIND_UI_LABELS[kind]} ({kind.replace(/_/g, " ")})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <LeadPathStep state={state} onChange={onChange} catalog={catalog} />
    </div>
  );
}

export default ExceptionStep;
