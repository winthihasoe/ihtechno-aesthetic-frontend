import { describe, expect, it } from "vitest";
import { compressVisitPhotoFile, prepareVisitPhotoForUpload } from "../compressVisitPhoto";

describe("compressVisitPhotoFile", () => {
  it("returns non-image files unchanged", async () => {
    const f = new File(["hello"], "note.txt", { type: "text/plain" });
    const out = await compressVisitPhotoFile(f);
    expect(out).toBe(f);
  });

  it("returns svg unchanged", async () => {
    const f = new File(["<svg/>"], "x.svg", { type: "image/svg+xml" });
    expect(await compressVisitPhotoFile(f)).toBe(f);
  });
});

describe("prepareVisitPhotoForUpload", () => {
  it("passes through non-images like prepare pipeline", async () => {
    const f = new File(["x"], "note.txt", { type: "text/plain" });
    const out = await prepareVisitPhotoForUpload(f);
    expect(out).toBe(f);
  });
});
