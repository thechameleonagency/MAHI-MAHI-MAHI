import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { PAGE_HEADER_PIN_HELP, pageHeaderPinTooltip } from "@/lib/pageHeaderPinCopy";
import {
  PAGE_HEADER_PIN_CONTROLS_COMPONENT,
  TOOLTIP_MAX_CHARS,
} from "@/lib/tooltipPopoverPolicy";

const SRC = resolve(process.cwd(), "src");

function tooltipContentBlocks(src: string): string[] {
  const blocks: string[] = [];
  const re = /<TooltipContent[^>]*>([\s\S]*?)<\/TooltipContent>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    blocks.push(m[1] ?? "");
  }
  return blocks;
}

function walkSourceFiles(dir: string, out: string[] = []): string[] {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkSourceFiles(p, out);
    else if (/\.(tsx|ts)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function relPath(abs: string): string {
  return abs.replace(/\\/g, "/").replace(/.*\/src\//, "src/");
}

describe("DS10 tooltip vs popover consistency", () => {
  it("documents tooltip max length and pin controls component", () => {
    expect(TOOLTIP_MAX_CHARS).toBeGreaterThanOrEqual(80);
    expect(PAGE_HEADER_PIN_CONTROLS_COMPONENT).toBe("PageHeaderPinControls");
  });

  it("page header pin tooltips stay short; help copy is verbose", () => {
    expect(pageHeaderPinTooltip(true).length).toBeLessThanOrEqual(TOOLTIP_MAX_CHARS);
    expect(pageHeaderPinTooltip(false).length).toBeLessThanOrEqual(TOOLTIP_MAX_CHARS);
    expect(PAGE_HEADER_PIN_HELP.length).toBeGreaterThan(TOOLTIP_MAX_CHARS);
  });

  it("PAGE_HEADER_PIN_HELP never appears inside TooltipContent", () => {
    const violations: string[] = [];
    for (const file of walkSourceFiles(SRC)) {
      const src = readFileSync(file, "utf8");
      for (const block of tooltipContentBlocks(src)) {
        if (block.includes("PAGE_HEADER_PIN_HELP")) {
          violations.push(relPath(file));
          break;
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("PageHeaderPinControls owns desktop pin tooltip + help popover", () => {
    const controls = readFileSync(
      resolve(SRC, "components/layout/PageHeaderPinControls.tsx"),
      "utf8",
    );
    const topHeader = readFileSync(resolve(SRC, "components/layout/TopHeader.tsx"), "utf8");

    expect(controls).toContain(PAGE_HEADER_PIN_CONTROLS_COMPONENT);
    expect(controls).toContain("TooltipContent");
    expect(controls).toContain("PopoverContent");
    expect(controls).toContain("PAGE_HEADER_PIN_HELP");
    expect(topHeader).toContain("PageHeaderPinControls");
    for (const block of tooltipContentBlocks(topHeader)) {
      expect(block).not.toContain("PAGE_HEADER_PIN_HELP");
    }
  });

  it("no multi-paragraph TooltipContent in app source", () => {
    const violations: string[] = [];
    for (const file of walkSourceFiles(SRC)) {
      const rel = relPath(file);
      if (rel.includes("components/ui/chart.tsx")) continue;
      const src = readFileSync(file, "utf8");
      for (const block of tooltipContentBlocks(src)) {
        const paragraphCount = (block.match(/<p\b/g) ?? []).length;
        if (paragraphCount >= 2) {
          violations.push(rel);
          break;
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("NeedToGet group picker does not nest rich copy in TooltipContent", () => {
    const src = readFileSync(resolve(SRC, "components/need-to-get/NeedToGetSheet.tsx"), "utf8");
    for (const block of tooltipContentBlocks(src)) {
      expect(block).not.toContain("NEED_TO_GET_MERGE_HINT");
    }
  });
});
