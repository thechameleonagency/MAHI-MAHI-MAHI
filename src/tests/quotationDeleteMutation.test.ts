import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("deleteQuotation mutation (MD8)", () => {
  const source = readFileSync(resolve(process.cwd(), "src/contexts/AppDataContext.tsx"), "utf8");

  it("does not clear project.quotationId on delete", () => {
    expect(source).toMatch(/const deleteQuotation = useCallback[\s\S]*?canDeleteQuotationRecord/);
    expect(source).not.toMatch(
      /deleteQuotation[\s\S]*?projects:\s*prev\.projects\.map\([^)]*quotationId:\s*undefined/,
    );
  });

  it("writes audit log and unlinks enquiries on successful delete", () => {
    expect(source).toMatch(
      /deleteQuotation[\s\S]*?createAuditEntry\(\s*"delete",\s*"Quotation"/,
    );
    expect(source).toMatch(/deleteQuotation[\s\S]*?unlinkQuotationFromEnquiries/);
  });
});
