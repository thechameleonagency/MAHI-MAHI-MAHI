import { describe, expect, it } from "vitest";
import {
  isDirectExceptionProject,
  projectDirectExceptionReason,
} from "@/lib/projectDirectException";

describe("projectDirectException", () => {
  it("returns null for missing or blank reason", () => {
    expect(projectDirectExceptionReason({})).toBeNull();
    expect(projectDirectExceptionReason({ directCreationReason: "   " })).toBeNull();
    expect(isDirectExceptionProject({})).toBe(false);
  });

  it("detects trimmed direct exception reason", () => {
    expect(projectDirectExceptionReason({ directCreationReason: "  Urgent mobilization  " })).toBe(
      "Urgent mobilization",
    );
    expect(isDirectExceptionProject({ directCreationReason: "Policy waiver" })).toBe(true);
  });
});
