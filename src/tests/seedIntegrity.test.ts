import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SEED_LAYERS, SEED_LAYER_ORDER } from "@/data/seedLayerOrder";

describe("seed integrity", () => {
  const seedSource = readFileSync(join(process.cwd(), "src", "data", "seedData.ts"), "utf8");

  it("seedData has no placeholder names or stock photo URLs", () => {
    expect(seedSource.toLowerCase()).not.toContain("unsplash");
    expect(seedSource).not.toMatch(/\bTBD\b/);
    expect(seedSource).not.toContain("John Doe");
  });

  it("seed layer order lists each layer once with valid dependencies", () => {
    expect(SEED_LAYER_ORDER.length).toBe(SEED_LAYERS.length);
    expect(new Set(SEED_LAYER_ORDER).size).toBe(SEED_LAYER_ORDER.length);

    const index = new Map(SEED_LAYER_ORDER.map((id, i) => [id, i]));
    for (const layer of SEED_LAYERS) {
      for (const dep of layer.dependsOn) {
        expect(index.has(dep)).toBe(true);
        expect(index.get(dep)! < index.get(layer.id)!).toBe(true);
      }
    }
  });
});
