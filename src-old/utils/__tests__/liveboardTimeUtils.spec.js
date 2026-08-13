import { describe, it, expect, vi, afterEach } from "vitest";
import dayjs from "dayjs";
import {
  formatLiveboardDuration,
  formatLiveboardRelativeTime,
} from "../liveboardTimeUtils";

describe("formatLiveboardDuration", () => {
  it('returns "just now" for zero minutes', () => {
    expect(formatLiveboardDuration(0)).toBe("just now");
  });

  it("formats sub-hour durations", () => {
    expect(formatLiveboardDuration(45)).toBe("45m");
  });

  it("formats hour-long durations", () => {
    expect(formatLiveboardDuration(80)).toBe("1h 20m");
  });
});

describe("formatLiveboardRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for current minute', () => {
    const now = dayjs("2026-06-09T14:30:00");
    vi.useFakeTimers();
    vi.setSystemTime(now.toDate());
    expect(formatLiveboardRelativeTime(now.toISOString())).toBe("just now");
  });

  it('returns "5 min ago" within the hour', () => {
    const now = dayjs("2026-06-09T14:30:00");
    vi.useFakeTimers();
    vi.setSystemTime(now.toDate());
    expect(
      formatLiveboardRelativeTime(now.subtract(5, "minute").toISOString()),
    ).toBe("5 min ago");
  });

  it('returns "Today HH:mm" for earlier today', () => {
    const now = dayjs("2026-06-09T14:30:00");
    vi.useFakeTimers();
    vi.setSystemTime(now.toDate());
    expect(
      formatLiveboardRelativeTime(now.subtract(2, "hour").toISOString()),
    ).toBe("Today 12:30");
  });

  it('returns "Yesterday HH:mm" for prior day', () => {
    const now = dayjs("2026-06-09T14:30:00");
    vi.useFakeTimers();
    vi.setSystemTime(now.toDate());
    expect(
      formatLiveboardRelativeTime(
        now.subtract(1, "day").hour(9).minute(15).toISOString(),
      ),
    ).toBe("Yesterday 09:15");
  });

  it("returns DD-MM-YYYY HH:mm for older dates", () => {
    const now = dayjs("2026-06-09T14:30:00");
    vi.useFakeTimers();
    vi.setSystemTime(now.toDate());
    expect(
      formatLiveboardRelativeTime("2026-06-01T08:00:00"),
    ).toBe("01-06-2026 08:00");
  });
});
