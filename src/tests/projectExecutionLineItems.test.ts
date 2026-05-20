import { describe, expect, it } from "vitest";
import {
  resolveProjectExecutionLineItems,
  withResolvedExecutionLineItems,
} from "@/domain/project/executionLineItems";
import { normalizeProject } from "@/lib/projectNormalize";
import type { Project } from "@/types/project";

const shellProject = (): Project => ({
  id: "P-1",
  name: "Test",
  type: "EPC",
  projectType: "Residential",
  projectCategory: "solar",
  ownerType: "solo",
  progressStage: "new",
  client: "Client",
  capacity: "5 kW",
  location: "Jaipur",
  assignees: [],
  onSite: 0,
  contractAmount: 100000,
  totalCost: 0,
  amountReceived: 0,
  photos: 0,
  startDate: "2026-01-01",
  endDate: null,
  createdAt: "2026-01-01",
  customerId: "C-1",
  lifecycleStatus: "New",
  executionPhase: "Intake",
});

describe("project executionLineItems", () => {
  it("resolveProjectExecutionLineItems returns [] when absent", () => {
    expect(resolveProjectExecutionLineItems(shellProject())).toEqual([]);
  });

  it("normalizeProject always materializes executionLineItems array", () => {
    const normalized = normalizeProject(shellProject());
    expect(Array.isArray(normalized.executionLineItems)).toBe(true);
    expect(normalized.executionLineItems).toEqual([]);
  });

  it("derives rows from commercial baseline when execution list is empty", () => {
    const resolved = withResolvedExecutionLineItems({
      ...shellProject(),
      commercialBaseline: {
        projectId: "P-1",
        customerId: "C-1",
        frozenAt: "2026-01-01",
        source: "intake",
        lines: [
          {
            id: "BL-1",
            description: "Panel",
            quantity: 10,
            unit: "pcs",
            inventoryItemId: 1,
          },
        ],
      },
    });
    expect(resolved.executionLineItems).toHaveLength(1);
    expect(resolved.executionLineItems![0].issuedQty).toBe(0);
  });
});
