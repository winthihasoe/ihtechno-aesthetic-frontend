import { describe, it, expect } from "vitest";
import { isImmersiveWorkspacePath } from "../immersiveRoutes";

describe("isImmersiveWorkspacePath", () => {
  it("matches consultation, treatment, and pre-treatment rooms", () => {
    expect(
      isImmersiveWorkspacePath("/reception/visits/42/consultation-room"),
    ).toBe(true);
    expect(
      isImmersiveWorkspacePath("/admin/visits/99/treatment-room/"),
    ).toBe(true);
    expect(
      isImmersiveWorkspacePath("/reception/visits/7/preparation-room"),
    ).toBe(true);
  });

  it("does not match standard workspace routes", () => {
    expect(isImmersiveWorkspacePath("/admin/live-board")).toBe(false);
    expect(isImmersiveWorkspacePath("/owner/reports/financial")).toBe(false);
  });
});
