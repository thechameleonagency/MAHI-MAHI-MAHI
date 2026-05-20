import { describe, expect, it } from "vitest";
import {
  isValidAbsoluteUrl,
  parsePhotoUrlLines,
  parseValidatedPhotoUrlLines,
  sanitizePhotoUrlList,
} from "@/lib/photoUrlLines";

describe("photoUrlLines (Mn16)", () => {
  it("parses comma and newline separated lines", () => {
    expect(parsePhotoUrlLines("https://a.example/x\nhttps://b.example/y, ")).toEqual([
      "https://a.example/x",
      "https://b.example/y",
    ]);
  });

  it("accepts http and https absolute URLs", () => {
    expect(isValidAbsoluteUrl("https://cdn.example/photo.jpg")).toBe(true);
    expect(isValidAbsoluteUrl("http://localhost:5173/x")).toBe(true);
  });

  it("rejects relative paths, bare hostnames, and non-URL text", () => {
    expect(isValidAbsoluteUrl("/uploads/1.jpg")).toBe(false);
    expect(isValidAbsoluteUrl("cdn.example/photo.jpg")).toBe(false);
    expect(isValidAbsoluteUrl("not a url")).toBe(false);
    expect(isValidAbsoluteUrl("ftp://files.example/x")).toBe(false);
  });

  it("partitions valid and invalid lines", () => {
    const result = parseValidatedPhotoUrlLines(
      "https://good.example/a\nbad-line\nhttp://good.example/b",
    );
    expect(result.valid).toEqual(["https://good.example/a", "http://good.example/b"]);
    expect(result.invalid).toEqual(["bad-line"]);
  });

  it("sanitizePhotoUrlList drops invalid entries", () => {
    expect(
      sanitizePhotoUrlList(["https://a.example", "oops", "http://b.example"]),
    ).toEqual(["https://a.example", "http://b.example"]);
    expect(sanitizePhotoUrlList(["nope"])).toBeUndefined();
  });
});
