import { describe, expect, it } from "vitest";
import { getInventoryHubPath } from "@/lib/inventoryHubPath";

describe("getInventoryHubPath", () => {
  it("sends salesperson to templates and ops roles to materials", () => {
    expect(getInventoryHubPath("salesperson")).toBe("/templates");
    expect(getInventoryHubPath("installation_team")).toBe("/inventory/materials");
    expect(getInventoryHubPath("admin")).toBe("/inventory/materials");
  });
});
