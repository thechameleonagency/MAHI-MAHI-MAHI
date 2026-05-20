import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("MaterialsSentTab mobile actions (MR8 / O12)", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components/projects/MaterialsSentTab.tsx"),
    "utf8",
  );

  it("keeps Send More inline and collapses secondary actions into More below md", () => {
    expect(source).toContain("Send More");
    expect(source).toContain('className="md:hidden shrink-0"');
    expect(source).toContain("MoreHorizontal");
    expect(source).toContain("Return unused");
    expect(source).toContain("Report damage");
    expect(source).toContain("Add to issue list");
  });

  it("shows full inline action row from md breakpoint up", () => {
    expect(source).toContain('className="hidden md:inline-flex"');
    expect(source).toContain("Return Unused");
    expect(source).toContain("Remove from Issue List");
  });
});
