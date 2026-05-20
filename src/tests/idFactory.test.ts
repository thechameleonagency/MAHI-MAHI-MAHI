import { describe, expect, it } from "vitest";
import {
  createNextCustomerId,
  createNumericLegacyId,
  ensureSequentialCustomerId,
  formatCustomerIdDisplay,
  isOpaqueCustomerId,
  isRecognizedCustomerId,
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

  it("detects opaque pre-M14 customer ids", () => {
    expect(isOpaqueCustomerId("CUST-2026-K2J5L9MX9KAS3F2P")).toBe(true);
    expect(isOpaqueCustomerId("Cm5k2j3abc4def")).toBe(true);
    expect(isOpaqueCustomerId("CUST-0007")).toBe(false);
    expect(isOpaqueCustomerId("C018")).toBe(false);
    expect(isRecognizedCustomerId("CUST-0010")).toBe(true);
  });

  it("ensureSequentialCustomerId replaces opaque or duplicate ids", () => {
    expect(ensureSequentialCustomerId("CUST-2026-RANDOM", ["C001"])).toBe("CUST-0002");
    expect(ensureSequentialCustomerId("CUST-0003", ["CUST-0003"])).toBe("CUST-0004");
    expect(ensureSequentialCustomerId("CUST-0005", ["C001", "CUST-0004"])).toBe("CUST-0005");
  });

  it("formatCustomerIdDisplay uppercases sequential CUST ids", () => {
    expect(formatCustomerIdDisplay("cust-0007")).toBe("CUST-0007");
    expect(formatCustomerIdDisplay("C018")).toBe("C018");
  });
});
