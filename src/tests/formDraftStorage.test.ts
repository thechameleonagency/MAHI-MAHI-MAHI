import { beforeEach, describe, expect, it } from "vitest";
import {
  clearAllFormDrafts,
  clearFormDraft,
  FORM_DRAFT_STORAGE_PREFIX,
  loadFormDraft,
  saveFormDraft,
} from "@/lib/formDraftStorage";

describe("formDraftStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists under mss.draft. prefix", () => {
    saveFormDraft("invoice-create-v1", { client: "x" });
    expect(localStorage.getItem(`${FORM_DRAFT_STORAGE_PREFIX}invoice-create-v1`)).toBeTruthy();
    expect(loadFormDraft<{ client: string }>("invoice-create-v1")?.client).toBe("x");
  });

  it("clearAllFormDrafts removes every draft key", () => {
    saveFormDraft("a", { n: 1 });
    saveFormDraft("b", { n: 2 });
    const removed = clearAllFormDrafts();
    expect(removed).toHaveLength(2);
    expect(loadFormDraft("a")).toBeNull();
  });

  it("clearFormDraft removes a single key", () => {
    saveFormDraft("only", { ok: true });
    clearFormDraft("only");
    expect(loadFormDraft("only")).toBeNull();
  });
});
