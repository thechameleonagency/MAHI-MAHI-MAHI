import { readFileSync, readdirSync } from "node:fs";

import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { DESTRUCTIVE_CONFIRM_COMPONENT } from "@/lib/confirmDialogPolicy";



const SRC = resolve(process.cwd(), "src");



/** Ad-hoc destructive confirm via raw AlertDialog (DS4). */

const AD_HOC_DESTRUCTIVE_ALERT = /AlertDialogAction[^>]*className="[^"]*bg-destructive/;



const ALLOWLIST_SUFFIXES = [

  "DestructiveConfirmDialog.tsx",

  "confirmDialogConsistency.test.ts",

  "alert-dialog.tsx",

  "QuotationApproveCustomerDialog.tsx",

];



function walkTsx(dir: string, out: string[] = []): string[] {

  for (const ent of readdirSync(dir, { withFileTypes: true })) {

    const p = join(dir, ent.name);

    if (ent.isDirectory()) walkTsx(p, out);

    else if (ent.name.endsWith(".tsx")) out.push(p);

  }

  return out;

}



function stripComments(src: string): string {

  return src

    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")

    .replace(/\/\*[\s\S]*?\*\//g, "")

    .replace(/\/\/.*$/gm, "");

}



describe("DS4 confirm dialog consistency", () => {

  it("documents destructive confirm component", () => {

    expect(DESTRUCTIVE_CONFIRM_COMPONENT).toBe("DestructiveConfirmDialog");

  });



  it("no window.confirm in application source", () => {

    const hits: string[] = [];

    for (const file of walkTsx(SRC)) {

      const rel = file.replace(/\\/g, "/").replace(`${SRC.replace(/\\/g, "/")}/`, "");

      if (rel.includes("DestructiveConfirmDialog") || rel.endsWith("DesignSystem.tsx")) continue;

      const src = stripComments(readFileSync(file, "utf8"));

      if (/\bwindow\.confirm\s*\(/.test(src)) {
        hits.push(rel);
      }

    }

    expect(hits).toEqual([]);

  });



  it("no ad-hoc destructive AlertDialogAction (use DestructiveConfirmDialog)", () => {

    const violations: string[] = [];

    for (const file of walkTsx(SRC)) {

      const rel = file.replace(/\\/g, "/").replace(`${SRC.replace(/\\/g, "/")}/`, "");

      if (ALLOWLIST_SUFFIXES.some((s) => rel.endsWith(s))) continue;

      const src = readFileSync(file, "utf8");

      if (AD_HOC_DESTRUCTIVE_ALERT.test(src)) {

        violations.push(rel);

      }

    }

    expect(violations).toEqual([]);

  });

});


