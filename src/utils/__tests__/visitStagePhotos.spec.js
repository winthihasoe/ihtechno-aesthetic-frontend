import { describe, expect, it, vi } from "vitest";
import { confirmIfMissingStagePhotos, stageHasBeforeAndAfter } from "../visitStagePhotos";

describe("visitStagePhotos", () => {
  it("stageHasBeforeAndAfter respects stage and legacy rows", () => {
    expect(
      stageHasBeforeAndAfter(
        [
          { type: "before", stage: "consultation" },
          { type: "after", stage: "consultation" },
        ],
        "consultation",
      ),
    ).toBe(true);

    expect(
      stageHasBeforeAndAfter(
        [{ type: "before" }, { type: "after" }],
        "consultation",
      ),
    ).toBe(true);

    expect(
      stageHasBeforeAndAfter([{ type: "before", stage: "preparation" }], "preparation"),
    ).toBe(false);
  });

  it("confirmIfMissingStagePhotos skips dialog when complete", async () => {
    const askConfirm = vi.fn();
    const out = await confirmIfMissingStagePhotos({
      askConfirm,
      photos: [
        { type: "before", stage: "treatment" },
        { type: "after", stage: "treatment" },
      ],
      stage: "treatment",
    });
    expect(out.ok).toBe(true);
    expect(out.payload).toEqual({});
    expect(askConfirm).not.toHaveBeenCalled();
  });

  it("confirmIfMissingStagePhotos returns payload when user confirms", async () => {
    const askConfirm = vi.fn().mockResolvedValue(true);
    const out = await confirmIfMissingStagePhotos({
      askConfirm,
      photos: [],
      stage: "preparation",
    });
    expect(out.ok).toBe(true);
    expect(out.payload).toEqual({ acknowledge_missing_photos: true });
    expect(askConfirm).toHaveBeenCalledTimes(1);
  });
});
