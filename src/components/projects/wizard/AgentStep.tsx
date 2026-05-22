import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Agent } from "@/types/finance";
import type { CreateProjectWizardState } from "@/types/createProjectWizard";

export interface AgentStepCatalog {
  agents?: Agent[];
}

export interface AgentStepProps {
  state: CreateProjectWizardState;
  onChange: (patch: Partial<CreateProjectWizardState>) => void;
  catalog?: AgentStepCatalog;
}

function filterActiveAgents(agents: Agent[]): Agent[] {
  return agents.filter((agent) => agent.status === "active");
}

function parseNumberInput(value: string): number | undefined {
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function numberInputValue(value: number | undefined): string {
  return value == null || Number.isNaN(value) ? "" : String(value);
}

export function AgentStep({ state, onChange, catalog }: AgentStepProps) {
  const agents = filterActiveAgents(catalog?.agents ?? []);
  const selectedAgentId = state.selectedAgentId ?? "";

  const handleAgentChange = (value: string) => {
    if (value === "__none__") {
      onChange({ selectedAgentId: undefined, commissionRatePct: undefined });
      return;
    }
    onChange({ selectedAgentId: value });
  };

  return (
    <div className="space-y-6" data-testid="wizard-agent-step">
      <p className="text-sm text-muted-foreground">
        Referral agent assignment is optional. If an agent brought this deal, select them and set a
        commission rate for accrual tracking.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="wizard-agent-select">Agent (optional)</Label>
          <Select value={selectedAgentId || "__none__"} onValueChange={handleAgentChange}>
            <SelectTrigger id="wizard-agent-select" data-testid="wizard-agent-select">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="wizard-commission-rate">Commission % (optional)</Label>
          <Input
            id="wizard-commission-rate"
            type="number"
            min={0}
            max={100}
            step={0.1}
            placeholder="e.g. 2"
            value={numberInputValue(state.commissionRatePct)}
            onChange={(e) => onChange({ commissionRatePct: parseNumberInput(e.target.value) })}
            disabled={!selectedAgentId}
            data-testid="wizard-commission-rate"
          />
          {!selectedAgentId && (
            <p className="text-xs text-muted-foreground">Select an agent to set commission.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default AgentStep;
