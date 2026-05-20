import { describe, expect, it } from "vitest";
import {
  createNextCustomerId,
  createNumericLegacyId,
  parseCustomerSequenceNumber,
} from "@/lib/idFactory";

describe("idFactory customer sequencing", () => {
  it("parses CUST-NNNN and legacy C### ids", () => {
    expect(parseCustomerSequenceNumber("CUST-0007")).toBe(7);
    expect(parseCustomerSequenceNumber("cust-0012")).toBe(12);
    expect(parseCustomerSequenceNumber("C018")).toBe(18);
    expect(parseCustomerSequenceNumber("CUST-2026-RANDOM")).toBeNull();
    expect(parseCustomerSequenceNumber("CLK9abc")).toBeNull();
  });

  it("allocates CUST-0001 when no customers exist", () => {
    expect(createNextCustomerId([])).toBe("CUST-0001");
  });

  it("continues after legacy seed ids", () => {
    const ids = ["C001", "C010", "C018"];
    expect(createNextCustomerId(ids)).toBe("CUST-0019");
  });

  it("continues after existing CUST-NNNN ids", () => {
    expect(createNextCustomerId(["CUST-0003", "CUST-0010"])).toBe("CUST-0011");
  });

  it("createNumericLegacyId remains available for migrations", () => {
    expect(createNumericLegacyId("C", 5)).toBe("C005");
  });
});
