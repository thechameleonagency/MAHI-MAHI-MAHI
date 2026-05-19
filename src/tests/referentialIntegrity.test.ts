import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const BANNED_LITERALS = ["C-unknown", "TBD_VENDOR_DISCOM"];
const BANNED_FK_PATTERNS = [/vendorOrDiscom:\s*["']TBD["']/];
const SRC_ROOT = join(process.cwd(), "src");

function collectTsFiles(dir: string): string[] {
  const { readdirSync, statSync } = require("fs") as typeof import("fs");
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "tests") continue;
      out.push(...collectTsFiles(p));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

describe("referentialIntegrity", () => {
  it("no banned placeholder IDs in src (except tests)", () => {
    const files = collectTsFiles(SRC_ROOT);
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const lit of BANNED_LITERALS) {
        if (text.includes(lit)) hits.push(`${file}: ${lit}`);
      }
      for (const re of BANNED_FK_PATTERNS) {
        if (re.test(text)) hits.push(`${file}: ${re}`);
      }
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });

  it("no name-based customer project join in pages", () => {
    const files = collectTsFiles(join(SRC_ROOT, "pages"));
    const pattern = /p\.client\s*===\s*customer\.name|q\.clientName\s*===\s*customer\.name/;
    const hits: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      if (pattern.test(text)) hits.push(file);
    }
    expect(hits, hits.join("\n")).toEqual([]);
  });
});
