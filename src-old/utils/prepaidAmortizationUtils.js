import dayjs from "dayjs";

export function periodKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function periodFromMonthKey(monthKey) {
  const [year, month] = String(monthKey).split("-");
  return {
    period_year: Number(year),
    period_month: Number(month),
  };
}

export function formatPeriod(year, month) {
  if (!year || !month) return "—";
  return dayjs(`${year}-${String(month).padStart(2, "0")}-01`).format("MMM YYYY");
}

export function isPrepaidAmortizationReady(prepaid) {
  if (prepaid?.status !== "active") return false;
  if (prepaid?.is_opening_balance) return true;
  return prepaid?.journal_posting_status === "posted";
}

export function postedPeriodKeys(prepaid) {
  return new Set(
    (prepaid?.amortizations || []).map((row) =>
      periodKey(row.period_year, row.period_month),
    ),
  );
}

export function lastPostedPeriod(prepaid) {
  const rows = [...(prepaid?.amortizations || [])].sort((a, b) => {
    if (a.period_year !== b.period_year) {
      return b.period_year - a.period_year;
    }
    return b.period_month - a.period_month;
  });
  return rows[0] ?? null;
}

export function amortizationServiceStart(prepaid) {
  if (prepaid?.is_opening_balance) {
    const raw = prepaid?.opening_balance_date || prepaid?.payment_date;
    return raw ? dayjs(raw).startOf("month").add(1, "month") : null;
  }
  return prepaid?.coverage_start
    ? dayjs(prepaid.coverage_start).startOf("month")
    : null;
}

export function duePeriods(prepaid, throughYear, throughMonth) {
  if (!isPrepaidAmortizationReady(prepaid)) return [];

  const start = amortizationServiceStart(prepaid);
  if (!start) return [];
  const end = dayjs(
    `${throughYear}-${String(throughMonth).padStart(2, "0")}-01`,
  ).startOf("month");
  if (end.isBefore(start, "month")) return [];

  const posted = postedPeriodKeys(prepaid);
  const periods = [];
  let cursor = start;
  const maxExtra = Number(prepaid?.remaining_months ?? 0) + posted.size;

  while (!cursor.isAfter(end, "month") && periods.length < maxExtra) {
    const key = cursor.format("YYYY-MM");
    if (!posted.has(key)) {
      periods.push({
        period_year: cursor.year(),
        period_month: cursor.month() + 1,
      });
    }
    cursor = cursor.add(1, "month");
  }

  return periods;
}

export function isPeriodPosted(prepaid, year, month) {
  return postedPeriodKeys(prepaid).has(periodKey(year, month));
}

export function amortizationListSummary(prepaid, throughYear, throughMonth) {
  const last = lastPostedPeriod(prepaid);
  const due = duePeriods(prepaid, throughYear, throughMonth);
  const selectedKey = periodKey(throughYear, throughMonth);
  const selectedPosted = isPeriodPosted(prepaid, throughYear, throughMonth);
  const selectedDue = due.some(
    (p) => periodKey(p.period_year, p.period_month) === selectedKey,
  );

  let status = "current";
  if (selectedPosted) {
    status = "posted";
  } else if (due.length > 1) {
    status = "behind";
  } else if (selectedDue) {
    status = "due";
  } else if (!last) {
    status = "none";
  }

  return {
    last,
    lastLabel: last
      ? formatPeriod(last.period_year, last.period_month)
      : null,
    dueCount: due.length,
    due,
    selectedPosted,
    selectedDue,
    status,
  };
}

export function summarizeRegisterAmortization(rows, throughYear, throughMonth) {
  let duePrepaids = 0;
  let postedForMonth = 0;
  let behindPrepaids = 0;
  let totalDuePeriods = 0;

  for (const prepaid of rows) {
    const summary = amortizationListSummary(prepaid, throughYear, throughMonth);
    totalDuePeriods += summary.dueCount;
    if (summary.selectedPosted) {
      postedForMonth += 1;
    }
    if (summary.selectedDue) {
      duePrepaids += 1;
    }
    if (summary.status === "behind") {
      behindPrepaids += 1;
    }
  }

  return {
    duePrepaids,
    postedForMonth,
    behindPrepaids,
    totalDuePeriods,
  };
}
