import { describe, expect, it } from "vitest";
import { APP_DIALOG_SIZE_CLASS } from "@/components/shared/AppSheetLayout";

describe("APP_DIALOG_SIZE_CLASS", () => {
  it("defines semantic sizes with mobile gutter (no raw 100vw)", () => {
    for (const token of Object.values(APP_DIALOG_SIZE_CLASS)) {
      expect(token).toMatch(/max-w-\[calc\(100vw/);
      expect(token).not.toMatch(/100vw\]/);
    }
  });

  it("maps xl to 4xl / 90vw cap (legacy detail sheets)", () => {
    expect(APP_DIALOG_SIZE_CLASS.xl).toMatch(/max-w-4xl/);
    expect(APP_DIALOG_SIZE_CLASS.xl).toMatch(/min\(90vw/);
  });

  it("maps xxl to 5xl / 95vw cap (invoice create)", () => {
    expect(APP_DIALOG_SIZE_CLASS.xxl).toMatch(/max-w-5xl/);
    expect(APP_DIALOG_SIZE_CLASS.xxl).toMatch(/min\(95vw/);
  });
});
