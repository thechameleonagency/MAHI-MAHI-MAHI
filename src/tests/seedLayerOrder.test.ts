import { describe, expect, it } from "vitest";
import { SEED_LAYERS, SEED_LAYER_ORDER } from "@/data/seedLayerOrder";

describe("seedLayerOrder", () => {
  it("lists every layer once in order", () => {
    expect(SEED_LAYER_ORDER.length).toBe(SEED_LAYERS.length);
    expect(new Set(SEED_LAYER_ORDER).size).toBe(SEED_LAYER_ORDER.length);
  });

  it("has attendance depending on projects and employees", () => {
    const att = SEED_LAYERS.find((l) => l.id === "L6_attendance_tasks");
    expect(att?.dependsOn).toContain("L5_projects_sites");
    expect(att?.dependsOn).toContain("L4_employees_teams");
  });
});
