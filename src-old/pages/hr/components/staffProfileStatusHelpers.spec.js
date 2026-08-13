import { describe, expect, it } from "vitest";
import {
  computeProbationEndDate,
  getStatusReminder,
  getStatusReminderDetails,
  isTerminalProfileStatus,
} from "./staffProfileStatusHelpers";

describe("staffProfileStatusHelpers", () => {
  it("computes probation end date from hire date and months", () => {
    expect(computeProbationEndDate("2026-01-15", 3)).toBe("2026-04-15");
  });

  it("shows probation_period_end when reference today is on or after probation end", () => {
    const hireDate = "2026-01-01";
    const probationMonths = 3;
    const probationEndDate = computeProbationEndDate(hireDate, probationMonths);

    expect(
      getStatusReminder({
        profileStatus: "probation",
        hireDate,
        probationMonths,
        probationEndDate,
        referenceToday: probationEndDate,
      }),
    ).toBe("probation_period_end");

    expect(
      getStatusReminder({
        profileStatus: "probation",
        hireDate,
        probationMonths,
        probationEndDate,
        referenceToday: "2026-05-01",
      }),
    ).toBe("probation_period_end");

    expect(
      getStatusReminder({
        profileStatus: "probation",
        hireDate,
        probationMonths,
        probationEndDate,
        referenceToday: "2026-03-31",
      }),
    ).toBeNull();
  });

  it("shows resignation_period_end when reference today is on or after end date", () => {
    expect(
      getStatusReminder({
        profileStatus: "resignation_period",
        resignationPeriodEndDate: "2026-02-28",
        referenceToday: "2026-02-28",
      }),
    ).toBe("resignation_period_end");

    expect(
      getStatusReminder({
        profileStatus: "resignation_period",
        resignationPeriodEndDate: "2026-02-28",
        referenceToday: "2026-03-01",
      }),
    ).toBe("resignation_period_end");

    expect(
      getStatusReminder({
        profileStatus: "resignation_period",
        resignationPeriodEndDate: "2026-02-28",
        referenceToday: "2026-02-27",
      }),
    ).toBeNull();
  });

  it("returns action labels for HR follow-up", () => {
    const details = getStatusReminderDetails({
      profileStatus: "probation",
      hireDate: "2025-01-01",
      probationMonths: 1,
      referenceToday: "2026-05-20",
    });

    expect(details.reminder).toBe("probation_period_end");
    expect(details.label).toBe("Probation period end");
    expect(details.actionLabel).toBe("Update profile status to Permanent");
  });

  it("does not remind when status is already permanent", () => {
    expect(
      getStatusReminder({
        profileStatus: "permanent",
        hireDate: "2020-01-01",
        probationMonths: 1,
        referenceToday: "2026-05-20",
      }),
    ).toBeNull();
  });

  it("identifies terminal profile statuses", () => {
    expect(isTerminalProfileStatus("resigned")).toBe(true);
    expect(isTerminalProfileStatus("probation")).toBe(false);
  });
});
