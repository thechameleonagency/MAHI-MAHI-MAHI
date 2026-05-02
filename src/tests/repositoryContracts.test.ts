import { describe, expect, it } from "vitest";
import { LocalStorageJsonRepository } from "@/infrastructure/repositories/localStorage/LocalStorageJsonRepository";

type DemoEntity = {
  id: string;
  name: string;
  amount: number;
};

describe("LocalStorageJsonRepository", () => {
  it("supports add, update, remove, and getById", () => {
    const key = "mss.test.repo";
    localStorage.removeItem(key);

    const repository = new LocalStorageJsonRepository<DemoEntity>(key, []);
    repository.add({ id: "1", name: "Initial", amount: 10 });
    repository.update("1", { amount: 25 });

    expect(repository.getById("1")?.amount).toBe(25);

    repository.remove("1");
    expect(repository.getById("1")).toBeUndefined();
  });
});
