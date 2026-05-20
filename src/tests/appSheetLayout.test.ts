import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  APP_DIALOG_SIZE_CLASS,
  APP_SHEET_MOBILE_FULLSCREEN_CLASS,
} from "@/components/shared/AppSheetLayout";

describe("APP_DIALOG_SIZE_CLASS", () => {
  it("defines semantic sizes with mobile gutter (no raw 100vw)", () => {
    for (const token of Object.values(APP_DIALOG_SIZE_CLASS)) {
      expect(token).toMatch(/max-w-\[calc\(100vw/);
      expect(token).not.toMatch(/100vw\]/);
    }
  });

  it("maps xl to 4xl / 90vw cap (legacy detail sheets)", () => {
    expect(APP_DIALOG_SIZE_CLASS.xl).toMatch(/max-w-4xl/);
    expect(APP_DIALOG_SIZE_CLASS.xl).toMatch(/min\(90vw/);
  });

  it("maps xxl to 5xl / 95vw cap (invoice create)", () => {
    expect(APP_DIALOG_SIZE_CLASS.xxl).toMatch(/max-w-5xl/);
    expect(APP_DIALOG_SIZE_CLASS.xxl).toMatch(/min\(95vw/);
  });
});

describe("APP_SHEET_MOBILE_FULLSCREEN_CLASS (MR7)", () => {
  it("expands sheet to full viewport below md", () => {
    expect(APP_SHEET_MOBILE_FULLSCREEN_CLASS).toMatch(/max-md:h-\[100dvh\]/);
    expect(APP_SHEET_MOBILE_FULLSCREEN_CLASS).toMatch(/max-md:max-w-none/);
    expect(APP_SHEET_MOBILE_FULLSCREEN_CLASS).toMatch(/max-md:rounded-none/);
  });

  it("is wired on bank reconciliation and project confirmation sheets", () => {
    const bank = readFileSync(
      resolve(process.cwd(), "src/components/audit/BankReconciliationSheet.tsx"),
      "utf8",
    );
    const createProject = readFileSync(
      resolve(process.cwd(), "src/components/projects/CreateProjectSheet.tsx"),
      "utf8",
    );
    const quotations = readFileSync(resolve(process.cwd(), "src/pages/Quotations.tsx"), "utf8");
    expect(bank).toContain("mobileFullScreen");
    expect(createProject).toContain("mobileFullScreen");
    expect(quotations).toMatch(/AppSheetContent[^>]*mobileFullScreen[\s\S]*ProjectConfirmationScreen/);
  });
});

describe("sheet.tsx right-side mobile gutter (MR3)", () => {
  it("applies viewport gutter on narrow right sheets", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/ui/sheet.tsx"), "utf8");
    expect(source).toMatch(/max-w-\[calc\(100vw-1\.5rem\)\]/);
    expect(source).not.toMatch(/w-\[100vw\]/);
  });
});
