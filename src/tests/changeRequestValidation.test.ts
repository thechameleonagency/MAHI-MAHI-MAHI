import { describe, expect, it } from "vitest";
import {
  parseChangeRequestFieldsFromForm,
  validateChangeRequestDraft,
} from "@/lib/changeRequestValidation";

describe("changeRequestValidation", () => {
  it("requires positive kW or amount for capacity", () => {
    expect(validateChangeRequestDraft({ type: "capacity" }).ok).toBe(false);
    expect(validateChangeRequestDraft({ type: "capacity", deltaKw: 2 }).ok).toBe(true);
    expect(validateChangeRequestDraft({ type: "capacity", deltaAmount: 5000 }).ok).toBe(true);
    expect(validateChangeRequestDraft({ type: "capacity", deltaKw: 0, deltaAmount: 0 }).ok).toBe(
      false,
    );
  });

  it("requires deltaPanels > 0 for panels type", () => {
    expect(validateChangeRequestDraft({ type: "panels" }).ok).toBe(false);
    expect(validateChangeRequestDraft({ type: "panels", deltaPanels: 4 }).ok).toBe(true);
    expect(validateChangeRequestDraft({ type: "panels", deltaPanels: 0 }).ok).toBe(false);
  });

  it("requires deltaAmount > 0 for addon-work type", () => {
    expect(validateChangeRequestDraft({ type: "addon-work" }).ok).toBe(false);
    expect(validateChangeRequestDraft({ type: "addon-work", deltaAmount: 25000 }).ok).toBe(true);
    expect(validateChangeRequestDraft({ type: "addon-work", deltaAmount: 0 }).ok).toBe(false);
  });

  it("parses only positive values from form strings", () => {
    expect(
      parseChangeRequestFieldsFromForm("panels", {
        deltaKw: "",
        deltaPanels: "6",
        deltaAmount: "",
      }),
    ).toEqual({ deltaPanels: 6 });
    expect(
      parseChangeRequestFieldsFromForm("capacity", {
        deltaKw: "0",
        deltaPanels: "",
        deltaAmount: "100",
      }),
    ).toEqual({ deltaAmount: 100 });
  });
});
