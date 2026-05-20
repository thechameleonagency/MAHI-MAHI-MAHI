import { describe, expect, it } from "vitest";
import { inferTransportWorkKind, resolveSiteForMaterialIssue } from "@/lib/materialIssueTransportTask";

describe("materialIssueTransportTask", () => {
  const sites = [
    { id: "SITE-1", name: "Jaipur Rooftop", projectId: "PROJ-2026-001" },
    { id: "SITE-2", name: "Other Site", projectId: "PROJ-2026-002" },
  ];

  it("resolves site by projectId (not display name alone)", () => {
    expect(resolveSiteForMaterialIssue(sites, "PROJ-2026-001", "Wrong Label")).toEqual({
      siteId: "SITE-1",
      siteName: "Jaipur Rooftop",
    });
  });

  it("falls back to project name when id missing", () => {
    expect(resolveSiteForMaterialIssue(sites, undefined, "Other Site")).toEqual({
      siteId: "SITE-2",
      siteName: "Other Site",
    });
  });

  it("infers panel transport from material names", () => {
    expect(inferTransportWorkKind(["Waaree 540W Panel"])).toEqual({
      workType: "Panel Transport",
      stageKey: "panel-transport",
    });
  });
});
