import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_SHEET_PRESETS, isFormSheetSizeViolation } from "@/lib/sheetPresets";
import { APP_DIALOG_SIZE_CLASS } from "@/components/shared/AppSheetLayout";

const SRC = resolve(process.cwd(), "src");

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkTsx(p, out);
    else if (ent.name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const FORBIDDEN_WIDTH_ON_APP_SHEET =
  /\b(?:sm:)?max-w-(?!\[calc\(100vw)|\bw-\[(?:min\()?(?:90|95|85|100)vw|\bmax-w-(?:3xl|4xl|5xl|6xl)\b/;

function extractAppSheetContentTags(source: string): string[] {
  const tags: string[] = [];
  const re = /<AppSheetContent\b[^>]*>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    tags.push(m[0]);
  }
  return tags;
}

describe("DS1 sheet size consistency", () => {
  it("defines presets that map to APP_DIALOG_SIZE_CLASS tokens", () => {
    for (const { size } of Object.values(APP_SHEET_PRESETS)) {
      expect(APP_DIALOG_SIZE_CLASS[size]).toBeTruthy();
    }
  });

  it("forbids form layout paired with detail-only widths (xl / wide)", () => {
    expect(isFormSheetSizeViolation("xl", "form")).toBe(true);
    expect(isFormSheetSizeViolation("wide", "form")).toBe(true);
    expect(isFormSheetSizeViolation("lg", "form")).toBe(false);
    expect(isFormSheetSizeViolation("xxl", "form")).toBe(false);
  });

  it("every AppSheetContent declares size or preset (no implicit defaults in call sites)", () => {
    const files = walkTsx(SRC).filter(
      (f) => !f.includes("AppSheetLayout.tsx") && !f.includes("sheetSizeConsistency.test"),
    );
    const missing: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      if (!src.includes("AppSheetContent")) continue;
      for (const tag of extractAppSheetContentTags(src)) {
        if (!/\bpreset=/.test(tag) && !/\bsize=/.test(tag)) {
          missing.push(`${file.replace(/\\/g, "/")}: ${tag}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it("no ad-hoc width overrides on AppSheetContent (except print:*)", () => {
    const violations: string[] = [];
    for (const file of walkTsx(SRC)) {
      const src = readFileSync(file, "utf8");
      if (!src.includes("AppSheetContent")) continue;
      for (const tag of extractAppSheetContentTags(src)) {
        const classMatch = tag.match(/\bclassName="([^"]*)"/);
        if (!classMatch) continue;
        const cls = classMatch[1];
        if (cls.includes("print:")) continue;
        if (FORBIDDEN_WIDTH_ON_APP_SHEET.test(cls)) {
          violations.push(`${file.replace(/\\/g, "/")}: ${tag}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it("Attendance and Teams use wideForm preset instead of form+xl", () => {
    const attendance = readFileSync(resolve(SRC, "pages/Attendance.tsx"), "utf8");
    const teams = readFileSync(resolve(SRC, "pages/Teams.tsx"), "utf8");
    expect(attendance).not.toMatch(/AppSheetContent[^>]*size="xl"[^>]*layout="form"/);
    expect(attendance).not.toMatch(/AppSheetContent[^>]*layout="form"[^>]*size="xl"/);
    expect(attendance).toContain('preset="wideForm"');
    expect(teams).toContain('preset="wideForm"');
  });

  it("InvoiceCreateSheet uses financeForm preset", () => {
    const src = readFileSync(
      resolve(SRC, "components/invoices/InvoiceCreateSheet.tsx"),
      "utf8",
    );
    expect(src).toContain('preset="financeForm"');
  });
});
