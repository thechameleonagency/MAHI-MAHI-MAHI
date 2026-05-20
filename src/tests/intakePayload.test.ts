import { describe, expect, it } from "vitest";
import { resolveIntakeLegacyKind, resolveProjectKindFromIntake } from "@/domain/project/intakePayload";
import type { ProjectIntakePayload } from "@/application/services/ProjectTypeService";
import { buildProjectShellFromQuotation } from "@/domain/project/buildProjectShellFromQuotation";
import type { Quotation } from "@/types/project";

const soloTyped: ProjectIntakePayload = {
  projectMode: "DIRECT_CLIENT",
  vendorshipOwner: "MSS",
  executionScope: "full",
  parties: { customer: "Acme", vendorOrDiscom: "V" },
  commercial: { contractAmount: 1, paymentType: "cash", internalCostEstimate: 0 },
};

describe("resolveIntakeLegacyKind", () => {
  it("maps valid legacy kind", () => {
    const r = resolveIntakeLegacyKind({
      kind: "PARTNER_EPC",
      parties: { customer: "A", partner: "B" },
      commercial: { contractAmount: 1, paymentType: "cash", internalCostEstimate: 0 },
    });
    expect(r).toEqual({ ok: true, kind: "PARTNER_EPC", shape: "legacy" });
  });

  it("maps valid typed taxonomy to legacy kind", () => {
    const r = resolveIntakeLegacyKind(soloTyped);
    expect(r).toEqual({ ok: true, kind: "SOLO_EPC", shape: "typed" });
  });

  it("rejects unknown legacy kind (no SOLO_EPC fallback)", () => {
    const r = resolveIntakeLegacyKind({
      kind: "NOT_A_KIND" as "SOLO_EPC",
      parties: { customer: "A" },
      commercial: { contractAmount: 1, paymentType: "cash" },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/Unknown project kind/i);
  });

  it("rejects unmapped typed taxonomy (no SOLO_EPC fallback)", () => {
    const r = resolveIntakeLegacyKind({
      projectMode: "INC_GIVEN_TO_US",
      vendorshipOwner: "MSS",
      executionScope: "full",
      parties: { customer: "A" },
      commercial: { contractAmount: 1, paymentType: "cash" },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/No project kind matches/i);
  });

  it("rejects partial typed payload", () => {
    const r = resolveIntakeLegacyKind({
      projectMode: "DIRECT_CLIENT",
      parties: { customer: "A" },
      commercial: { contractAmount: 1, paymentType: "cash" },
    } as ProjectIntakePayload);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/projectMode, vendorshipOwner, and executionScope/i);
  });

  it("rejects empty intake with explicit message", () => {
    const r = resolveIntakeLegacyKind({
      parties: {},
      commercial: {},
    } as ProjectIntakePayload);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/legacy.*typed|Intake must use/i);
  });

  it("rejects conflicting legacy kind and typed taxonomy", () => {
    const r = resolveIntakeLegacyKind({
      kind: "PARTNER_EPC",
      projectMode: "DIRECT_CLIENT",
      vendorshipOwner: "MSS",
      executionScope: "full",
      parties: { customer: "A", partner: "B" },
      commercial: { contractAmount: 1, paymentType: "cash", internalCostEstimate: 0 },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/conflicts with projectMode/i);
  });
});

describe("resolveProjectKindFromIntake", () => {
  it("returns PROJECT_INTAKE_SHAPE_INVALID for unmapped typed intake", () => {
    const r = resolveProjectKindFromIntake({
      projectMode: "PARTNER_NETWORK",
      vendorshipOwner: "MSS",
      executionScope: "full",
      parties: { customer: "A" },
      commercial: { contractAmount: 1, paymentType: "cash" },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errorCode).toBe("PROJECT_INTAKE_SHAPE_INVALID");
  });
});

describe("buildProjectShellFromQuotation intake gate", () => {
  const quotation: Quotation = {
    id: "Q-1",
    quotationNumber: "Q-001",
    status: "approved",
    quotationType: "solar",
    clientName: "Acme",
    clientPhone: "999",
    clientEmail: "a@acme.com",
    clientCity: "",
    clientState: "",
    systemCategory: "commercial",
    systemCapacity: "120",
    paymentType: "cash",
    totalAmount: 1,
    isConverted: false,
    createdAt: "2026-01-01",
  };

  it("fails closed when typed intake does not map to any kind", () => {
    const result = buildProjectShellFromQuotation({
      quotation,
      intake: {
        projectMode: "INC_GIVEN_TO_US",
        vendorshipOwner: "MSS",
        executionScope: "full",
        parties: { customer: "X" },
        commercial: { contractAmount: 1, paymentType: "cash" },
      },
      projectName: "Test",
      projectId: "P-1",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errorCode).toBe("PROJECT_INTAKE_SHAPE_INVALID");
  });

  it("still builds for valid typed solo intake", () => {
    const result = buildProjectShellFromQuotation({
      quotation,
      intake: soloTyped,
      projectName: "Solo",
      projectId: "P-2",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.project.projectKind).toBe("SOLO_EPC");
  });
});
