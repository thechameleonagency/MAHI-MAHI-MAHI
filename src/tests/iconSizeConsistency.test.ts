import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { ICON_CLASS_NAV, ICON_CLASS_NAV_MENU } from "@/lib/iconSizes";
import { LAYOUT_ICON_SIZE } from "@/lib/iconSizePolicy";

const LAYOUT_DIR = resolve(process.cwd(), "src/components/layout");

/** Lucide / icon elements in layout chrome must stay at 16px — not badge shells. */
const FORBIDDEN_ICON_CLASS =
  /\bclassName="[^"]*(?:h-3\.5\s+w-3\.5|h-5\s+w-5|h-\[18px\]|sm:h-\[18px\])/;

function walkLayoutFiles(dir: string, out: string[] = []): string[] {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkLayoutFiles(p, out);
    else if (ent.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

describe("DS9 layout icon size consistency", () => {
  it("documents nav icon size tokens", () => {
    expect(ICON_CLASS_NAV).toContain(LAYOUT_ICON_SIZE);
    expect(ICON_CLASS_NAV_MENU).toContain(LAYOUT_ICON_SIZE);
  });

  it("layout chrome does not use mixed h-3.5 / h-5 / 18px lucide sizes", () => {
    const violations: string[] = [];
    for (const file of walkLayoutFiles(LAYOUT_DIR)) {
      const rel = file.replace(/\\/g, "/").replace(/.*\/src\//, "src/");
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (!FORBIDDEN_ICON_CLASS.test(line)) return;
        if (!/<[A-Z][A-Za-z0-9]*\s+className=/.test(line)) return;
        violations.push(`${rel}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(violations).toEqual([]);
  });

  it("primary layout modules import ICON_CLASS_NAV", () => {
    const required = [
      "TopHeader.tsx",
      "Sidebar.tsx",
      "GlobalSearch.tsx",
      "NotificationBellLink.tsx",
    ];
    const missing: string[] = [];
    for (const name of required) {
      const src = readFileSync(join(LAYOUT_DIR, name), "utf8");
      if (!src.includes("ICON_CLASS_NAV")) missing.push(name);
    }
    expect(missing).toEqual([]);
  });
});
