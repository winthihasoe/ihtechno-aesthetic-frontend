import { describe, expect, it } from "vitest";
import { getTreatmentDoneBlockReason } from "../treatmentSessionUtils";

describe("getTreatmentDoneBlockReason", () => {
  it("requires at least one session", () => {
    expect(getTreatmentDoneBlockReason([])).toMatch(/at least one/i);
  });

  it("requires completed sessions", () => {
    expect(
      getTreatmentDoneBlockReason([{ status: "in_progress", approval_status: "not_required" }]),
    ).toMatch(/finish each open/i);
  });

  it("requires doctor approval", () => {
    expect(
      getTreatmentDoneBlockReason([
        { status: "completed", approval_status: "pending_approval" },
      ]),
    ).toMatch(/approved/i);
  });

  it("returns empty when all sessions are completed and approved", () => {
    expect(
      getTreatmentDoneBlockReason([
        { status: "completed", approval_status: "approved" },
      ]),
    ).toBe("");
  });
});
