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

export function postedPeriodKeys(asset) {
  return new Set(
    (asset?.depreciations || []).map((row) =>
      periodKey(row.period_year, row.period_month),
    ),
  );
}

export function lastPostedPeriod(asset) {
  const rows = [...(asset?.depreciations || [])].sort((a, b) => {
    if (a.period_year !== b.period_year) {
      return b.period_year - a.period_year;
    }
    return b.period_month - a.period_month;
  });
  return rows[0] ?? null;
}

export function duePeriods(asset, throughYear, throughMonth) {
  if (asset?.status === "retired") return [];

  const serviceStart = asset?.in_service_date || asset?.purchase_date;
  if (!serviceStart) return [];

  const start = dayjs(serviceStart).startOf("month");
  const end = dayjs(
    `${throughYear}-${String(throughMonth).padStart(2, "0")}-01`,
  ).startOf("month");
  if (end.isBefore(start, "month")) return [];

  const posted = postedPeriodKeys(asset);
  const periods = [];
  let cursor = start;

  while (!cursor.isAfter(end, "month")) {
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

export function isPeriodPosted(asset, year, month) {
  return postedPeriodKeys(asset).has(periodKey(year, month));
}

export function depreciationListSummary(asset, throughYear, throughMonth) {
  const last = lastPostedPeriod(asset);
  const due = duePeriods(asset, throughYear, throughMonth);
  const selectedKey = periodKey(throughYear, throughMonth);
  const selectedPosted = isPeriodPosted(asset, throughYear, throughMonth);
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

export function summarizeRegisterDepreciation(rows, throughYear, throughMonth) {
  let dueAssets = 0;
  let postedForMonth = 0;
  let behindAssets = 0;
  let totalDuePeriods = 0;

  for (const asset of rows) {
    const summary = depreciationListSummary(asset, throughYear, throughMonth);
    totalDuePeriods += summary.dueCount;
    if (summary.selectedPosted) {
      postedForMonth += 1;
    }
    if (summary.selectedDue) {
      dueAssets += 1;
    }
    if (summary.status === "behind") {
      behindAssets += 1;
    }
  }

  return {
    dueAssets,
    postedForMonth,
    behindAssets,
    totalDuePeriods,
  };
}
