import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ENTITY_TYPES = [
  "project",
  "customer",
  "employee",
  "partner",
  "vendor",
  "quotation",
  "invoice",
  "agent",
  "vendorshipCompany",
  "incGiverCompany",
] as const;

function countEntityLinksInPages(): number {
  const pagesDir = join(process.cwd(), "src", "pages");
  let count = 0;

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".tsx")) {
        const text = readFileSync(full, "utf8");
        const matches = text.match(/<EntityLink\b/g);
        if (matches) count += matches.length;
      }
    }
  };

  walk(pagesDir);
  return count;
}

function detailPagesUseRouteResolver(): string[] {
  const pagesDir = join(process.cwd(), "src", "pages");
  const missing: string[] = [];
  const detailPattern = /(Detail|Profile)\.tsx$/;

  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (detailPattern.test(entry.name)) {
        const text = readFileSync(full, "utf8");
        if (!text.includes("findByRouteId") && !text.includes("getProjectById") && !text.includes("getPartnerById") && !text.includes("getEmployeeById") && !text.includes("normalizeLoanPersonKey")) {
          missing.push(entry.name);
        }
      }
    }
  };

  walk(pagesDir);
  return missing;
}

describe("navigation coverage", () => {
  it("detail/profile pages resolve route ids via helper or domain getter", () => {
    expect(detailPagesUseRouteResolver()).toEqual([]);
  });

  it("uses EntityLink more than 10 times across src/pages", () => {
    const count = countEntityLinksInPages();
    expect(count).toBeGreaterThan(10);
  });

  it("EntityInfoSheet union types each have a render handler in renderContent", () => {
    const path = join(process.cwd(), "src", "components", "shared", "EntityInfoSheet.tsx");
    const source = readFileSync(path, "utf8");

    const switchBlock = source.match(/const renderContent = \(\) => \{[\s\S]*?switch \(entityType\) \{([\s\S]*?)\n {4}\}/);
    expect(switchBlock, "renderContent switch").toBeTruthy();
    const cases = switchBlock![1];

    for (const type of ENTITY_TYPES) {
      expect(cases, `missing case for ${type}`).toContain(`case "${type}":`);
      const handlerName = `render${type.charAt(0).toUpperCase()}${type.slice(1)}Info`;
      const altHandlers: Record<string, string> = {
        vendorshipCompany: "renderVendorshipCompanyInfo",
        incGiverCompany: "renderIncGiverCompanyInfo",
      };
      const expected = altHandlers[type] ?? handlerName;
      expect(source, `missing handler for ${type}`).toContain(`const ${expected}`);
      expect(cases, `case ${type} must call handler`).toMatch(
        new RegExp(`case "${type}":[\\s\\S]*?return ${expected}\\(\\)`),
      );
    }
  });
});
