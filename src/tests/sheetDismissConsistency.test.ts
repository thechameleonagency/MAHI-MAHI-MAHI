import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { FORM_SHEET_CANCEL_LABEL } from "@/lib/formActionLabels";
import { FORM_SHEET_FOOTER_COMPONENT } from "@/lib/sheetDismissPolicy";

const SRC = resolve(process.cwd(), "src");

/** Dedicated form sheets (DS8) — must expose Cancel via AppSheetFormFooter or FORM_SHEET_CANCEL_LABEL. */
const FORM_SHEET_FILES = [
  "components/audit/BankReconciliationSheet.tsx",
  "components/projects/ChangeRequestSheet.tsx",
  "components/projects/CreateProjectSheet.tsx",
  "components/projects/ScheduleInstallationSheet.tsx",
  "components/projects/AdditionalWorkSheet.tsx",
  "components/projects/SiteVisitSheet.tsx",
  "components/projects/MaterialDamageSheet.tsx",
  "components/invoices/InvoiceCreateSheet.tsx",
  "components/invoices/ClientSelectionSheet.tsx",
  "components/employees/TaskAssignmentSheet.tsx",
  "components/templates/CreateTemplateModal.tsx",
  "components/settings/MasterDataEditor.tsx",
];

/** Read-only / success-only sheets may use Close or Done without Cancel. */
const READ_ONLY_SHEET_ALLOWLIST = [
  "components/shared/EntityInfoSheet.tsx",
  "components/shared/ImageViewerModal.tsx",
];

function hasFormSheetCancelPattern(src: string): boolean {
  return (
    src.includes("AppSheetFormFooter") ||
    src.includes(FORM_SHEET_CANCEL_LABEL) ||
    />Cancel</.test(src) ||
    /Cancel<\/Button>/.test(src)
  );
}

function walkSheetComponents(dir: string, out: string[] = []): string[] {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkSheetComponents(p, out);
    else if (ent.name.endsWith("Sheet.tsx")) out.push(p);
  }
  return out;
}

describe("DS8 sheet dismiss consistency", () => {
  it("documents form sheet footer component and cancel label", () => {
    expect(FORM_SHEET_FOOTER_COMPONENT).toBe("AppSheetFormFooter");
    expect(FORM_SHEET_CANCEL_LABEL).toBe("Cancel");
  });

  it("form sheet modules use AppSheetFormFooter or FORM_SHEET_CANCEL_LABEL", () => {
    const violations: string[] = [];
    for (const rel of FORM_SHEET_FILES) {
      const src = readFileSync(resolve(SRC, rel), "utf8");
      if (!hasFormSheetCancelPattern(src)) violations.push(`${rel}: missing Cancel footer pattern`);
    }
    expect(violations).toEqual([]);
  });

  it("no Close-only footer on audited form sheets with user input", () => {
    const violations: string[] = [];
    for (const rel of FORM_SHEET_FILES) {
      const src = readFileSync(resolve(SRC, rel), "utf8");
      if (/>Close<|>Close\s*</.test(src) && !src.includes(FORM_SHEET_CANCEL_LABEL)) {
        violations.push(`${rel}: uses Close without Cancel label`);
      }
    }
    expect(violations).toEqual([]);
  });

  it("dedicated *Sheet.tsx under components include Cancel unless read-only allowlist", () => {
    const violations: string[] = [];
    const root = join(SRC, "components");
    for (const file of walkSheetComponents(root)) {
      const rel = file.replace(/\\/g, "/").replace(`${SRC.replace(/\\/g, "/")}/`, "");
      if (READ_ONLY_SHEET_ALLOWLIST.includes(rel)) continue;
      if (!rel.includes("/")) continue;
      const src = readFileSync(file, "utf8");
      const hasInput = /<(?:Input|Textarea)\b/.test(src);
      if (!hasInput) continue;
      if (!hasFormSheetCancelPattern(src)) {
        violations.push(`${rel}: form inputs but no Cancel footer pattern`);
      }
    }
    expect(violations).toEqual([]);
  });
});
