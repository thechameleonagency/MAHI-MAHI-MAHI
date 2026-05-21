import { describe, expect, it } from "vitest";
import { migratePersistedState } from "@/lib/migratePersistedIds";

describe("migratePersistedIds enquiry assignedTo (ER1)", () => {
  it("preserves enquiry assignedTo display name strings", () => {
    const raw = {
      enquiries: [
        {
          id: "ENQ-1",
          assignedTo: "Priya Nair",
          customerName: "Test",
        },
      ],
    };
    const migrated = migratePersistedState(raw) as typeof raw;
    expect(migrated.enquiries[0].assignedTo).toBe("Priya Nair");
  });
});
