import { describe, expect, it } from "vitest";
import { normalizeQuotations } from "@/data/appSeedBuilder";
import {
  buildQuotationProjectLinkPatch,
  migrateQuotationProjectLink,
  migrateQuotationsProjectLinks,
  quotationLinkedProjectId,
} from "@/lib/quotationProjectLink";
import type { Quotation } from "@/types/project";

const base: Quotation = {
  id: "Q1",
  quotationNumber: "MSS/26/099",
  clientName: "Test",
  clientPhone: "9000000000",
  clientState: "Telangana",
  status: "approved",
  quotationType: "solar",
  totalAmount: 100000,
  createdAt: "2026-01-01",
};

describe("migrateQuotationProjectLink", () => {
  it("copies legacy convertedToProjectId to linkedProjectId and drops legacy", () => {
    const migrated = migrateQuotationProjectLink({
      ...base,
      convertedToProjectId: "PROJ-LEGACY",
    });
    expect(migrated.linkedProjectId).toBe("PROJ-LEGACY");
    expect("convertedToProjectId" in migrated).toBe(false);
  });

  it("prefers linkedProjectId when both fields exist", () => {
    const migrated = migrateQuotationProjectLink({
      ...base,
      linkedProjectId: "PROJ-NEW",
      convertedToProjectId: "PROJ-OLD",
    });
    expect(migrated.linkedProjectId).toBe("PROJ-NEW");
    expect("convertedToProjectId" in migrated).toBe(false);
  });

  it("normalizeQuotations applies migration", () => {
    const [q] = normalizeQuotations([
      { ...base, status: "converted_to_project", convertedToProjectId: "P-X" },
    ]);
    expect(q.linkedProjectId).toBe("P-X");
    expect("convertedToProjectId" in q).toBe(false);
  });
});

describe("buildQuotationProjectLinkPatch", () => {
  it("sets linkedProjectId and clears legacy on convert", () => {
    const patch = buildQuotationProjectLinkPatch("PROJ-1");
    expect(patch.status).toBe("converted_to_project");
    expect(patch.linkedProjectId).toBe("PROJ-1");
    expect(patch.convertedToProjectId).toBeUndefined();
    expect(patch.convertedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("migrateQuotationsProjectLinks", () => {
  it("batch migrates array", () => {
    const out = migrateQuotationsProjectLinks([
      { ...base, convertedToProjectId: "A" },
      { ...base, id: "Q2", linkedProjectId: "B" },
    ]);
    expect(quotationLinkedProjectId(out[0])).toBe("A");
    expect(quotationLinkedProjectId(out[1])).toBe("B");
    expect(out.every((q) => !("convertedToProjectId" in q))).toBe(true);
  });
});
