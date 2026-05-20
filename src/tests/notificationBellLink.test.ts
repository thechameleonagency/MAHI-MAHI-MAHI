import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("NotificationBellLink (Mn6)", () => {
  it("anchors badge on a relative wrapper, not inside the link", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/layout/NotificationBellLink.tsx"),
      "utf8",
    );
    expect(source).toContain('className={cn("relative inline-flex shrink-0"');
    expect(source).toContain("translate-x-1/2");
    expect(source).toContain("-translate-y-1/2");
    expect(source).not.toContain("-right-0.5");
  });

  it("TopHeader uses NotificationBellLink instead of inline absolute badge", () => {
    const header = readFileSync(resolve(process.cwd(), "src/components/layout/TopHeader.tsx"), "utf8");
    expect(header).toContain("NotificationBellLink");
    expect(header).not.toContain("absolute -right-0.5 -top-0.5");
  });
});
