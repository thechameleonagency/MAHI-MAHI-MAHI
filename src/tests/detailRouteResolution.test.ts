import { describe, expect, it } from "vitest";
import { findByRouteId } from "@/lib/resolveEntityId";

describe("detailRouteResolution", () => {
  it("resolves string ids across entity types", () => {
    expect(findByRouteId([{ id: "C001", name: "A" }], "C001")?.name).toBe("A");
    expect(findByRouteId([{ id: "V001", name: "V" }], "V001")?.name).toBe("V");
    expect(findByRouteId([{ id: "EMP001", name: "E" }], "EMP001")?.name).toBe("E");
    expect(findByRouteId([{ id: "TEAM-001", name: "T" }], "TEAM-001")?.name).toBe("T");
    expect(findByRouteId([{ id: "PROJ-2026-001", name: "P" }], "PROJ-2026-001")?.name).toBe("P");
  });

  it("returns undefined for empty or missing route id", () => {
    expect(findByRouteId([{ id: "C001" }], undefined)).toBeUndefined();
    expect(findByRouteId([{ id: "C001" }], "")).toBeUndefined();
  });
});
