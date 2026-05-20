import { describe, expect, it } from "vitest";
import { resolvePageErrorRecovery } from "@/lib/routeErrorRecovery";

describe("resolvePageErrorRecovery", () => {
  it("uses project list recovery on project detail routes", () => {
    const r = resolvePageErrorRecovery("/projects/P-123");
    expect(r.backTo).toBe("/projects");
    expect(r.backLabel).toMatch(/projects/i);
  });

  it("uses dashboard recovery elsewhere", () => {
    const r = resolvePageErrorRecovery("/quotations");
    expect(r.backTo).toBe("/");
    expect(r.backLabel).toMatch(/dashboard/i);
  });
});
