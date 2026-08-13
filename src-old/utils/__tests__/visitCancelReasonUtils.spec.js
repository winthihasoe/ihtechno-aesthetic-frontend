import {
  formatVisitCancelledAt,
  parseVisitCancelReason,
} from "../visitCancelReasonUtils";

describe("parseVisitCancelReason", () => {
  it("parses manual carryover cancel with preset reason", () => {
    expect(
      parseVisitCancelReason(
        "manual_carryover_cancel: No-show / patient left",
      ),
    ).toEqual({
      source: "Carryover cancel",
      reason: "No-show / patient left",
      note: null,
    });
  });

  it("parses manual carryover cancel with reason and note", () => {
    expect(
      parseVisitCancelReason(
        "manual_carryover_cancel: Other — patient called to reschedule",
      ),
    ).toEqual({
      source: "Carryover cancel",
      reason: "Other",
      note: "patient called to reschedule",
    });
  });

  it("parses legacy overnight codes", () => {
    expect(parseVisitCancelReason("clinic_closed_no_show")).toEqual({
      source: "Overnight close",
      reason: "Clinic closed — no show",
      note: null,
    });
  });
});

describe("formatVisitCancelledAt", () => {
  it("formats as DD-MM-YYYY hh:mm", () => {
    expect(formatVisitCancelledAt("2026-07-03T14:30:00+07:00")).toMatch(
      /^03-07-2026 \d{2}:\d{2}$/,
    );
  });
});
