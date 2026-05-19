import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isValidGstin } from "@/lib/validators/gstin";
import { assertNonNegative } from "@/lib/validators/numeric";

describe("forms validation (X1, X4, X6)", () => {
  describe("X1 — GSTIN", () => {
    it("accepts a valid 15-character GSTIN", () => {
      expect(isValidGstin("27AAAAA0004A1Z5")).toBe(true);
    });

    it("rejects too-short and malformed GSTINs", () => {
      expect(isValidGstin("")).toBe(false);
      expect(isValidGstin("27AAAA")).toBe(false);
      expect(isValidGstin("27aaaaa0004a1z5")).toBe(true);
      expect(isValidGstin("XXAAAAA0004A1Z5")).toBe(false);
    });
  });

  describe("X4 — no empty SelectItem value", () => {
    it("has no SelectItem with value=\"\" in src", () => {
      const srcRoot = join(process.cwd(), "src");
      const offenders: string[] = [];

      const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const full = join(dir, entry.name);
          if (entry.isDirectory()) {
            if (entry.name === "node_modules") continue;
            walk(full);
          } else if (/\.(tsx|ts)$/.test(entry.name)) {
            const text = readFileSync(full, "utf8");
            if (/SelectItem[^>]*\svalue=""/.test(text) || /<SelectItem\s+value="">/.test(text)) {
              offenders.push(full.replace(process.cwd(), "").replace(/\\/g, "/"));
            }
          }
        }
      };

      walk(srcRoot);
      expect(offenders).toEqual([]);
    });
  });

  describe("X6 — non-negative numeric helper", () => {
    it("returns the value when non-negative", () => {
      expect(assertNonNegative(0)).toBe(0);
      expect(assertNonNegative(42.5)).toBe(42.5);
    });

    it("throws for negative or non-finite values", () => {
      expect(() => assertNonNegative(-1)).toThrow(/non-negative/i);
      expect(() => assertNonNegative(Number.NaN)).toThrow(/finite/i);
    });
  });
});
