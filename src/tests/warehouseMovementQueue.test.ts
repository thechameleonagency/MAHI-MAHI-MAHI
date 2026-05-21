import { describe, expect, it } from "vitest";
import {
  enqueueWarehouseMovement,
  resetWarehouseMovementQueueForTests,
} from "@/lib/warehouseMovementQueue";

describe("warehouseMovementQueue (ER6)", () => {
  it("runs tasks strictly one after another", async () => {
    resetWarehouseMovementQueueForTests();
    const order: number[] = [];

    const first = enqueueWarehouseMovement(async () => {
      await new Promise((r) => setTimeout(r, 30));
      order.push(1);
      return "a";
    });
    const second = enqueueWarehouseMovement(async () => {
      order.push(2);
      return "b";
    });

    await Promise.all([first, second]);
    expect(order).toEqual([1, 2]);
  });
});
