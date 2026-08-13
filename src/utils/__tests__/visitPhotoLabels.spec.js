import { describe, expect, it } from "vitest";
import {
  photosForStage,
  photosFromEarlierStages,
  shortVisitPhotoCaption,
} from "../visitPhotoLabels";

describe("visitPhotoLabels", () => {
  const photos = [
    { id: 1, type: "before", stage: "consultation", body_area: "face", url: "/a.jpg" },
    { id: 2, type: "after", stage: "consultation", body_area: "belly", side: "left", url: "/b.jpg" },
    { id: 3, type: "before", stage: "preparation", body_area: "face", url: "/c.jpg" },
  ];

  it("photosFromEarlierStages excludes current and later stages", () => {
    const prep = photosFromEarlierStages(photos, "preparation");
    expect(prep.map((p) => p.id)).toEqual([1, 2]);
    const treat = photosFromEarlierStages(photos, "treatment");
    expect(treat.map((p) => p.id)).toEqual([1, 2, 3]);
  });

  it("photosForStage filters by stage", () => {
    expect(photosForStage(photos, "consultation").map((p) => p.id)).toEqual([1, 2]);
  });

  it("shortVisitPhotoCaption includes type area side", () => {
    expect(shortVisitPhotoCaption(photos[1])).toContain("After");
    expect(shortVisitPhotoCaption(photos[1])).toContain("Belly");
    expect(shortVisitPhotoCaption(photos[1])).toContain("Left");
  });
});
