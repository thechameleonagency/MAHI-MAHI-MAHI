import { UserPlus } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateInput } from "@/components/ui/DateInput";
import type { Employee } from "@/types/project";
import type { CreateProjectWizardState } from "@/types/createProjectWizard";

export interface TeamStepCatalog {
  employees?: Employee[];
}

export interface TeamStepProps {
  state: CreateProjectWizardState;
  onChange: (patch: Partial<CreateProjectWizardState>) => void;
  catalog?: TeamStepCatalog;
}

function filterActiveEmployees(employees: Employee[]): Employee[] {
  return employees.filter((employee) => employee.status === "Active");
}

export function TeamStep({ state, onChange, catalog }: TeamStepProps) {
  const employees = filterActiveEmployees(catalog?.employees ?? []);
  const assigneeId = state.primaryAssigneeId ?? "";

  const handleAssigneeChange = (value: string) => {
    if (value === "__none__") {
      onChange({ primaryAssigneeId: undefined, targetEndDate: undefined });
      return;
    }
    onChange({ primaryAssigneeId: value });
  };

  return (
    <div className="space-y-6" data-testid="wizard-team-step">
      <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
        <h3 className="mb-2 flex items-center gap-2 text-base font-semibold">
          <UserPlus className="h-4 w-4 text-warning" />
          Team &amp; schedule
        </h3>
        <p className="text-sm text-muted-foreground">
          Assign a primary lead and target end date now, or skip — the project will show an
          &quot;Assign team&quot; reminder until someone is assigned.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="wizard-primary-assignee">Primary assignee (optional)</Label>
          <Select value={assigneeId || "__none__"} onValueChange={handleAssigneeChange}>
            <SelectTrigger id="wizard-primary-assignee" data-testid="wizard-primary-assignee">
              <SelectValue placeholder="Assign later" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Assign later</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wizard-target-end-date">Target end date (optional)</Label>
          <DateInput
            id="wizard-target-end-date"
            value={state.targetEndDate ?? ""}
            onChange={(value) => onChange({ targetEndDate: value || undefined })}
            data-testid="wizard-target-end-date"
          />
          {assigneeId && (
            <p className="text-xs text-muted-foreground">
              End date must be today or later when an assignee is set.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamStep;
