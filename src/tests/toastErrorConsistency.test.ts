import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  COMMAND_ERROR_MESSAGES,
  friendlyCommandErrorMessage,
  isCommandErrorCode,
} from "@/lib/commandErrorMessages";
import { COMMAND_ERROR_TOAST_HELPER } from "@/lib/toastErrorPolicy";

const SRC = resolve(process.cwd(), "src");

/** Raw `.error` passed straight to toast description (DS7). */
const RAW_ERROR_IN_TOAST_DESC =
  /description:\s*(?:result|res|r|ur|sync|conv|created)\.error\b/;

const ALLOWLIST_SUFFIXES = [
  "commandErrorMessages.ts",
  "commandErrorToast.ts",
  "toastErrorConsistency.test.ts",
];

function walkTsx(dir: string, out: string[] = []): string[] {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) walkTsx(p, out);
    else if (/\.tsx?$/.test(ent.name)) out.push(p);
  }
  return out;
}

describe("DS7 toast error message consistency", () => {
  it("documents toast error helper", () => {
    expect(COMMAND_ERROR_TOAST_HELPER).toBe("friendlyCommandErrorMessage");
  });

  it("maps known error codes to prose", () => {
    expect(friendlyCommandErrorMessage("ENQUIRY_NOT_FOUND")).toBe(
      COMMAND_ERROR_MESSAGES.ENQUIRY_NOT_FOUND,
    );
    expect(friendlyCommandErrorMessage("QUOTATION_ZERO_AMOUNT")).toContain("₹0");
  });

  it("preserves existing prose messages", () => {
    expect(friendlyCommandErrorMessage("Enquiry not found")).toBe("Enquiry not found");
  });

  it("humanizes unknown SCREAMING_SNAKE codes", () => {
    expect(isCommandErrorCode("ENQUIRY_NOT_FOUND")).toBe(true);
    expect(friendlyCommandErrorMessage("SOME_NEW_CODE")).toBe("Some New Code");
  });

  it("no toast descriptions pass raw result.error without friendlyCommandErrorMessage", () => {
    const violations: string[] = [];
    for (const file of walkTsx(SRC)) {
      const rel = file.replace(/\\/g, "/").replace(`${SRC.replace(/\\/g, "/")}/`, "");
      if (ALLOWLIST_SUFFIXES.some((s) => rel.endsWith(s))) continue;
      const src = readFileSync(file, "utf8");
      if (!RAW_ERROR_IN_TOAST_DESC.test(src)) continue;
      if (!src.includes("friendlyCommandErrorMessage") && !src.includes("showCommandErrorToast")) {
        violations.push(rel);
      }
    }
    expect(violations).toEqual([]);
  });
});
