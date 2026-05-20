import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = resolve(process.cwd(), "src");

/** Legacy bare empty rows / blocks (DS2). */
const BARE_EMPTY_PATTERNS: RegExp[] = [
  /py-8 text-center text-muted-foreground/,
  /py-6 text-center text-sm text-muted-foreground/,
  /py-10 text-center text-muted-foreground/,
  /px-6 py-8 text-center text-sm text-muted-foreground/,
  /px-6 py-10 text-center text-muted-foreground/,
  /p-8 text-center text-sm text-muted-foreground/,
  /text-center py-8 text-muted-foreground/,
];

const ALLOWLIST_SUFFIXES = [
  "command.tsx",
  "PermissionMatrixReference.tsx",
  "listEmptyStateConsistency.test.ts",
];

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkTsx(p, out);
    else if (ent.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

function rel(file: string): string {
  return file.replace(/\\/g, "/").replace(`${SRC.replace(/\\/g, "/")}/`, "");
}

describe("DS2 list empty state consistency", () => {
  it("no bare py-* centered empty blocks outside allowlist", () => {
    const violations: string[] = [];
    for (const file of walkTsx(SRC)) {
      const relPath = rel(file);
      if (ALLOWLIST_SUFFIXES.some((s) => relPath.endsWith(s))) continue;
      const src = readFileSync(file, "utf8");
      for (const pattern of BARE_EMPTY_PATTERNS) {
        if (pattern.test(src)) {
          violations.push(`${relPath}: ${pattern}`);
          break;
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("exports ListEmptyState and TableEmptyRow helpers", () => {
    expect(readFileSync(resolve(SRC, "components/ui/ListEmptyState.tsx"), "utf8")).toContain(
      'density?: "default" | "compact"',
    );
    expect(readFileSync(resolve(SRC, "components/ui/TableEmptyRow.tsx"), "utf8")).toContain("ListEmptyState");
  });

  it("DesignSystem documents empty states", () => {
    const ds = readFileSync(resolve(SRC, "pages/DesignSystem.tsx"), "utf8");
    expect(ds).toContain("ListEmptyState");
    expect(ds).toContain("TableEmptyRow");
  });
});
