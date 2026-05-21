import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { WORK_STATUS_STAGES } from "@/types/blockage";
import {
  countCompletedWorkStatusSubItems,
  pickFocusWorkStatusStageKey,
  workStatusStageNeedsAttention,
} from "@/lib/progressReportWorkStatusMobile";

describe("progressReportWorkStatusMobile (MO1)", () => {
  it("pickFocusWorkStatusStageKey prefers first unchecked stage", () => {
    expect(
      pickFocusWorkStatusStageKey(WORK_STATUS_STAGES, ["structure"], {}),
    ).toBe("panel");
  });

  it("pickFocusWorkStatusStageKey falls back to attention stage when all checked", () => {
    const allChecked = WORK_STATUS_STAGES.map((s) => s.value);
    expect(
      pickFocusWorkStatusStageKey(WORK_STATUS_STAGES, allChecked, {
        inverter: { status: "requested" },
      }),
    ).toBe("inverter");
  });

  it("countCompletedWorkStatusSubItems tracks approved sub-items", () => {
    const structure = WORK_STATUS_STAGES.find((s) => s.value === "structure")!;
    const { done, total } = countCompletedWorkStatusSubItems(structure, {
      structure: {
        subItemApprovals: {
          "structure-procurement": { status: "approved" },
        },
      },
    });
    expect(total).toBe(structure.subItems.length);
    expect(done).toBe(1);
  });

  it("workStatusStageNeedsAttention when sub-items incomplete", () => {
    const panel = WORK_STATUS_STAGES.find((s) => s.value === "panel")!;
    expect(workStatusStageNeedsAttention(panel, [], {})).toBe(true);
  });
});

describe("ProgressReportTab mobile work checklist (MO1)", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components/projects/ProgressReportTab.tsx"),
    "utf8",
  );

  it("uses stage picker and single-stage view on mobile", () => {
    expect(source).toContain("WorkStatusMobileStagePicker");
    expect(source).toContain("workStatusStagesForView");
    expect(source).toContain("pickFocusWorkStatusStageKey");
  });

  it("replaces horizontal timeline scroll with grid on mobile", () => {
    expect(source).toContain('isMobile\n                    ? "grid grid-cols-4 gap-2"');
  });

  it("expands sub-items on mobile without nested collapsible trigger", () => {
    expect(source).toContain("open={isMobile ? true : undefined}");
    expect(source).toContain("Sub-items ({stage.subItems.length})");
  });
});
