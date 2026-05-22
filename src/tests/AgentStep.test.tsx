import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AgentStep } from "@/components/projects/wizard/AgentStep";
import { createInitialCreateProjectWizardState } from "@/types/createProjectWizard";
import type { Agent } from "@/types/finance";

function makeAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "AG-1",
    name: "Referral Agent",
    phone: "9999999999",
    address: "Delhi",
    ratePerKw: 1000,
    rateType: "per-kw",
    status: "active",
    createdAt: "2026-01-01",
    ...overrides,
  } as Agent;
}

describe("AgentStep", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders agent select and commission field", () => {
    render(
      <AgentStep
        state={createInitialCreateProjectWizardState()}
        onChange={vi.fn()}
        catalog={{ agents: [makeAgent()] }}
      />,
    );

    expect(screen.getByTestId("wizard-agent-select")).toBeTruthy();
    expect(screen.getByTestId("wizard-commission-rate")).toBeTruthy();
  });

  it("filters inactive agents from the picker", () => {
    render(
      <AgentStep
        state={createInitialCreateProjectWizardState()}
        onChange={vi.fn()}
        catalog={{
          agents: [
            makeAgent({ id: "AG-1", name: "Active Agent" }),
            makeAgent({ id: "AG-2", name: "Inactive Agent", status: "inactive" }),
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("combobox"));

    expect(screen.getByText("Active Agent")).toBeTruthy();
    expect(screen.queryByText("Inactive Agent")).toBeNull();
  });

  it("disables commission until an agent is selected", () => {
    render(
      <AgentStep
        state={createInitialCreateProjectWizardState()}
        onChange={vi.fn()}
        catalog={{ agents: [makeAgent()] }}
      />,
    );

    expect((screen.getByTestId("wizard-commission-rate") as HTMLInputElement).disabled).toBe(true);
  });

  it("clears agent and commission when None is selected", () => {
    const onChange = vi.fn();
    render(
      <AgentStep
        state={createInitialCreateProjectWizardState({
          selectedAgentId: "AG-1",
          commissionRatePct: 2,
        })}
        onChange={onChange}
        catalog={{ agents: [makeAgent()] }}
      />,
    );

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("None"));

    expect(onChange).toHaveBeenCalledWith({
      selectedAgentId: undefined,
      commissionRatePct: undefined,
    });
  });
});
