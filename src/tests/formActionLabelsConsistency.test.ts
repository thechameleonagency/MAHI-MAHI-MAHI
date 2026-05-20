import { readFileSync, readdirSync } from "node:fs";

import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {

  FORM_CREATE_LABEL,

  FORM_SAVE_LABEL,

  LEGACY_FORM_PRIMARY_LABELS,

  formPrimaryLabel,

} from "@/lib/formActionLabels";



const SRC = resolve(process.cwd(), "src");



function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
}

function walkTsx(dir: string, out: string[] = []): string[] {

  for (const ent of readdirSync(dir, { withFileTypes: true })) {

    const p = join(dir, ent.name);

    if (ent.isDirectory()) walkTsx(p, out);

    else if (ent.name.endsWith(".tsx")) out.push(p);

  }

  return out;

}



const ALLOWLIST_SUFFIXES = [

  "formActionLabels.ts",

  "formActionLabelsConsistency.test.ts",

  "RoleMatrixTab.tsx",

];



/** Workflow-specific labels that are not generic create/edit CTAs. */

const ALLOWLIST_SNIPPETS = ["Submit Deletion Request", "Review &amp; Create", "Review & Create"];



describe("DS3 form action label consistency", () => {

  it("formPrimaryLabel returns Save for edit and Create for create", () => {

    expect(formPrimaryLabel("edit")).toBe(FORM_SAVE_LABEL);

    expect(formPrimaryLabel("create")).toBe(FORM_CREATE_LABEL);

    expect(formPrimaryLabel("create", "agent")).toBe("Create agent");

    expect(formPrimaryLabel("edit", "agent")).toBe(FORM_SAVE_LABEL);

  });



  it("no legacy primary CTA strings in TSX (use formPrimaryLabel)", () => {

    const violations: string[] = [];

    for (const file of walkTsx(SRC)) {

      const rel = file.replace(/\\/g, "/").replace(`${SRC.replace(/\\/g, "/")}/`, "");

      if (ALLOWLIST_SUFFIXES.some((s) => rel.endsWith(s))) continue;

      const src = stripComments(readFileSync(file, "utf8"));

      for (const label of LEGACY_FORM_PRIMARY_LABELS) {

        if (!src.includes(label)) continue;

        if (ALLOWLIST_SNIPPETS.some((s) => src.includes(s))) continue;

        violations.push(`${rel}: "${label}"`);

        break;

      }

    }

    expect(violations).toEqual([]);

  });



  it("DesignSystem documents form action labels", () => {

    const ds = readFileSync(resolve(SRC, "pages/DesignSystem.tsx"), "utf8");

    expect(ds).toContain("formPrimaryLabel");

    expect(ds).toContain(FORM_SAVE_LABEL);

    expect(ds).toContain(FORM_CREATE_LABEL);

  });

});


