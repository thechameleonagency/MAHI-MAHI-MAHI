import { describe, expect, it } from "vitest";
import {
  parseChangeRequestFieldsFromForm,
  validateChangeRequestDraft,
} from "@/lib/changeRequestValidation";

describe("changeRequestValidation", () => {
  it("requires non-zero kW or amount for capacity", () => {
    expect(validateChangeRequestDraft({ type: "capacity" }).ok).toBe(false);
    expect(validateChangeRequestDraft({ type: "capacity", deltaKw: 2 }).ok).toBe(true);
    expect(validateChangeRequestDraft({ type: "capacity", deltaAmount: 5000 }).ok).toBe(true);
    expect(validateChangeRequestDraft({ type: "capacity", deltaKw: -1 }).ok).toBe(true);
    expect(validateChangeRequestDraft({ type: "capacity", deltaAmount: -5000 }).ok).toBe(true);
    expect(validateChangeRequestDraft({ type: "capacity", deltaKw: 0, deltaAmount: 0 }).ok).toBe(
      false,
    );
  });

  it("requires deltaPanels > 0 for panels type", () => {
    expect(validateChangeRequestDraft({ type: "panels" }).ok).toBe(false);
    expect(validateChangeRequestDraft({ type: "panels", deltaPanels: 4 }).ok).toBe(true);
    expect(validateChangeRequestDraft({ type: "panels", deltaPanels: 0 }).ok).toBe(false);
  });

  it("requires non-zero amount for addon-work (negative allowed for scope reduction)", () => {
    expect(validateChangeRequestDraft({ type: "addon-work" }).ok).toBe(false);
    expect(validateChangeRequestDraft({ type: "addon-work", deltaAmount: 25000 }).ok).toBe(true);
    expect(validateChangeRequestDraft({ type: "addon-work", deltaAmount: -25000 }).ok).toBe(true);
    expect(validateChangeRequestDraft({ type: "addon-work", deltaAmount: 0 }).ok).toBe(false);
  });

  it("parses signed non-zero values from form strings", () => {
    expect(
      parseChangeRequestFieldsFromForm("panels", {
        deltaKw: "",
        deltaPanels: "6",
        deltaAmount: "",
      }),
    ).toEqual({ deltaPanels: 6 });
    expect(
      parseChangeRequestFieldsFromForm("capacity", {
        deltaKw: "-2",
        deltaPanels: "",
        deltaAmount: "",
      }),
    ).toEqual({ deltaKw: -2 });
    expect(
      parseChangeRequestFieldsFromForm("addon-work", {
        deltaKw: "",
        deltaPanels: "",
        deltaAmount: "-30000",
      }),
    ).toEqual({ deltaAmount: -30000 });
    expect(
      parseChangeRequestFieldsFromForm("capacity", {
        deltaKw: "0",
        deltaPanels: "",
        deltaAmount: "100",
      }),
    ).toEqual({ deltaAmount: 100 });
  });
});
