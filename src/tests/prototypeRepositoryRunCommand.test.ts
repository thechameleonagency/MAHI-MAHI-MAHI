import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("runCommand repository sync (MD9)", () => {
  const source = readFileSync(resolve(process.cwd(), "src/contexts/AppDataContext.tsx"), "utf8");

  it("syncs all prototype mirrors before command-bus execute", () => {
    expect(source).toMatch(
      /const runCommand = useCallback[\s\S]*?syncPrototypeRepositoriesFromAppState\(state, repositories\)[\s\S]*?commandBus\.execute/,
    );
  });

  it("cross-tab listener reacts to mss.repo.* storage keys", () => {
    expect(source).toContain("isPrototypeRepositoryStorageKey(e.key)");
  });
});
