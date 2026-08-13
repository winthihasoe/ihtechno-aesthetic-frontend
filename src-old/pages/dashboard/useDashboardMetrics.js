import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { listFollowUpTasks } from "../../services/followUpService";
import { getBalanceSheetReport, getReportBySlug } from "../../services/financeService";
import {
  getMonthlyRankings,
  getOperationalSummary,
  getPackagePurchases,
  getTreatmentPopularity,
  getTreatmentTrend,
} from "../../services/reportService";
import { getInventoryAlerts } from "../inventory/inventoryService";
import { getVisits } from "../../services/visitService";

const COMPLETED_STATUSES = new Set(["completed"]);
const FOLLOW_UP_DONE = new Set(["completed", "skipped"]);

function getPeriodRange(periodKey) {
  const now = dayjs();
  if (periodKey === "month") {
    return { start: now.startOf("month"), end: now.endOf("month") };
  }
  if (periodKey === "week") {
    return { start: now.startOf("week"), end: now.endOf("week") };
  }
  return { start: now.startOf("day"), end: now.endOf("day") };
}

function getPreviousPeriodRange(periodKey) {
  const now = dayjs();
  if (periodKey === "month") {
    const currentStart = now.startOf("month");
    return {
      start: currentStart.subtract(1, "month"),
      end: currentStart.subtract(1, "day"),
    };
  }
  if (periodKey === "week") {
    const currentStart = now.startOf("week");
    return {
      start: currentStart.subtract(1, "week"),
      end: currentStart.subtract(1, "day"),
    };
  }
  const yesterday = now.subtract(1, "day");
  return { start: yesterday.startOf("day"), end: yesterday.endOf("day") };
}

function safeRatio(numerator, denominator) {
  if (!denominator) return null;
  return numerator / denominator;
}

function sumPackageLiability(rows) {
  if (!Array.isArray(rows)) return 0;
  return rows.reduce((sum, row) => sum + (row.remaining_value ?? 0), 0);
}

function customerDepositFromBalanceSheet(balanceSheet) {
  const liabilitySection = (balanceSheet?.sections ?? []).find(
    (section) =>
      String(section?.label ?? "").toLowerCase().includes("liabilit") ||
      section?.type === "liability",
  );
  const lines = liabilitySection?.lines ?? [];
  const deposit = lines.find((line) => String(line?.code) === "20010");
  return Number(deposit?.balance ?? 0) || 0;
}

function percentageChange(currentValue, previousValue) {
  if (previousValue === 0) {
    return currentValue > 0 ? 100 : 0;
  }
  return ((currentValue - previousValue) / previousValue) * 100;
}

function formatTrend(currentValue, previousValue) {
  const change = percentageChange(currentValue, previousValue);
  return {
    delta: change,
    direction: change >= 0 ? "up" : "down",
    label: `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`,
  };
}

function buildFollowUpBoard(followUps) {
  const now = dayjs();
  const startToday = now.startOf("day");
  const weekEndDay = now.endOf("week").startOf("day");

  const open = followUps.filter((task) => !FOLLOW_UP_DONE.has(task.status));

  let overdue = 0;
  let dueToday = 0;
  let dueThisWeek = 0;

  followUps.forEach((task) => {
    if (FOLLOW_UP_DONE.has(task.status)) return;
    const due = dayjs(task.due_date);
    if (!due.isValid()) return;
    if (due.isBefore(startToday, "day")) overdue += 1;
    else if (due.isSame(startToday, "day")) dueToday += 1;
    else if (due.isAfter(startToday, "day") && !due.isAfter(weekEndDay, "day")) {
      dueThisWeek += 1;
    }
  });

  const preview = [...open]
    .sort((a, b) => {
      const da = dayjs(a.due_date).valueOf();
      const db = dayjs(b.due_date).valueOf();
      const validA = dayjs(a.due_date).isValid();
      const validB = dayjs(b.due_date).isValid();
      if (!validA && !validB) return 0;
      if (!validA) return 1;
      if (!validB) return -1;
      return da - db;
    })
    .slice(0, 6)
    .map((task) => ({
      id: task.id,
      patientName: task.patient?.name ?? "Patient",
      dueDate: task.due_date,
      status: task.status,
      type: task.type,
      headline: task.follow_up_context?.headline ?? null,
    }));

  return {
    overdue,
    dueToday,
    dueThisWeek,
    openCount: open.length,
    preview,
  };
}

function mapTreatmentTrend(series) {
  return (series ?? []).map((row) => {
    const d = dayjs(row.date);
    return {
      key: row.date,
      shortLabel: d.format("D"),
      tooltipLabel: d.format("MMM D"),
      value: row.session_count ?? 0,
    };
  });
}

function mapTreatmentPopularity(items) {
  return (items ?? []).map((row, index) => ({
    key: `treatment-${row.template_id ?? index}`,
    label: row.name,
    value: row.usage_count ?? 0,
  }));
}

function mapPackageWeekly(series) {
  return (series ?? []).map((row) => {
    const d = dayjs(row.date);
    return {
      key: row.date,
      shortLabel: d.format("ddd"),
      value: row.purchase_count ?? 0,
    };
  });
}

function buildStaffWorkload(visits) {
  const activeVisits = visits.filter((visit) => !COMPLETED_STATUSES.has(visit.status));
  const workloadMap = new Map();

  activeVisits.forEach((visit) => {
    const doctorId = visit.doctor?.id ?? visit.doctor_id;
    const doctorName = visit.doctor?.name;
    if (doctorId && doctorName) {
      const key = `doctor-${doctorId}`;
      workloadMap.set(key, {
        role: "Doctor",
        name: doctorName,
        count: (workloadMap.get(key)?.count ?? 0) + 1,
      });
    }
    const therapists = Array.isArray(visit.therapists)
      ? visit.therapists
      : visit.therapist
        ? [visit.therapist]
        : [];
    therapists.forEach((therapist) => {
      if (!therapist?.id || !therapist?.name) return;
      const key = `therapist-${therapist.id}`;
      workloadMap.set(key, {
        role: "Therapist",
        name: therapist.name,
        count: (workloadMap.get(key)?.count ?? 0) + 1,
      });
    });
  });

  return Array.from(workloadMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

function buildMetrics({
  periodKey,
  summary,
  treatmentTrend,
  treatmentPopularity,
  packagePurchases,
  monthlyRankings,
  profitCurrent,
  profitPrevious,
  reconciliation,
  packageLiabilityRows,
  balanceSheet,
  followUps,
  visits,
  alerts,
}) {
  const current = summary?.current ?? {};
  const previous = summary?.previous ?? {};
  const appointments = current.appointments ?? {};

  const uniquePatients = current.unique_patients ?? 0;
  const newPatients = current.new_patients ?? 0;
  const returningPatients = Math.max(0, uniquePatients - newPatients);
  const revenue = current.revenue ?? 0;
  const collections = current.collections ?? 0;
  const treatmentSessions = current.treatment_sessions ?? 0;
  const appointmentsBooked = appointments.booked ?? 0;

  const netProfit = profitCurrent?.net_profit ?? 0;
  const profitRevenue = profitCurrent?.total_revenue ?? 0;
  const previousNetProfit = profitPrevious?.net_profit ?? 0;

  const mixFootnote = `${appointments.completed ?? 0} completed · ${appointments.cancelled ?? 0} cancelled · ${appointments.no_show ?? 0} no-show (same window)`;

  const lowStock = Array.isArray(alerts?.low_stock) ? alerts.low_stock.length : 0;
  const outOfStock = Array.isArray(alerts?.low_stock)
    ? alerts.low_stock.filter((item) => item.stock_status === "out").length
    : 0;

  const followUpBoard = buildFollowUpBoard(followUps);
  const staffWorkload = buildStaffWorkload(visits);

  const queueItems = [
    {
      key: "overdue_followups",
      label: "Overdue follow-ups",
      value: followUpBoard.overdue,
      path: "follow-up-center",
    },
    {
      key: "out_of_stock",
      label: "Out of stock products",
      value: outOfStock,
      path: "inventory",
    },
    {
      key: "low_stock",
      label: "Low stock products",
      value: lowStock,
      path: "inventory",
    },
    {
      key: "pending_appointments",
      label: "Pending appointments",
      value: appointments.pending ?? 0,
      path: "appointments",
    },
  ].filter((item) => item.value > 0);

  return {
    periodKey,
    kpis: {
      activity: {
        uniquePatients: {
          value: uniquePatients,
          newPatients,
          returningPatients,
          trend: formatTrend(uniquePatients, previous.unique_patients ?? 0),
        },
        treatmentSessions: {
          value: treatmentSessions,
          trend: formatTrend(treatmentSessions, previous.treatment_sessions ?? 0),
        },
        appointmentsBooked: {
          value: appointmentsBooked,
          mixFootnote,
          trend: formatTrend(appointmentsBooked, previous.appointments_booked ?? 0),
        },
        activeOnFloor: {
          value: current.active_visits ?? 0,
        },
      },
      money: {
        revenue: {
          value: revenue,
          avgPerPatient: safeRatio(revenue, uniquePatients),
          trend: formatTrend(revenue, previous.revenue ?? 0),
        },
        collections: {
          value: collections,
          realizationPct: safeRatio(collections, revenue),
          trend: formatTrend(collections, previous.collections ?? 0),
        },
        netProfit: {
          value: netProfit,
          marginPct: safeRatio(netProfit, profitRevenue),
          trend: formatTrend(netProfit, previousNetProfit),
        },
        receivables: {
          value: reconciliation?.accounts_receivable_balance ?? 0,
        },
        totalLiabilities: {
          value: balanceSheet?.totals?.liabilities ?? 0,
          supplierPayables:
            reconciliation?.supplier_payables_open_balance ?? 0,
          customerDepositGl: customerDepositFromBalanceSheet(balanceSheet),
        },
        packageLiability: {
          value: sumPackageLiability(packageLiabilityRows),
        },
      },
    },
    appointmentMix: {
      booked: appointmentsBooked,
      completed: appointments.completed ?? 0,
      cancelled: appointments.cancelled ?? 0,
      noShow: appointments.no_show ?? 0,
    },
    followUp: followUpBoard,
    inventory: { lowStock, outOfStock },
    pendingActions: queueItems,
    staffWorkload,
    charts: {
      treatmentTrend: mapTreatmentTrend(treatmentTrend?.series),
      treatmentPopularity: mapTreatmentPopularity(treatmentPopularity?.items),
      packageWeekly: mapPackageWeekly(packagePurchases?.series),
    },
    monthlySummary:
      periodKey === "month"
        ? {
            rankings: monthlyRankings,
          }
        : null,
  };
}

function normalizeArrayResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

export default function useDashboardMetrics(periodKey, { includeFinancialSnapshots = true } = {}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rawData, setRawData] = useState({
    summary: null,
    treatmentTrend: null,
    treatmentPopularity: null,
    packagePurchases: null,
    monthlyRankings: null,
    profitCurrent: null,
    profitPrevious: null,
    reconciliation: null,
    packageLiabilityRows: null,
    balanceSheet: null,
    followUps: [],
    visits: [],
    alerts: { low_stock: [] },
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { start, end } = getPeriodRange(periodKey);
      const { start: prevStart, end: prevEnd } = getPreviousPeriodRange(periodKey);
      const fromDate = start.format("YYYY-MM-DD");
      const toDate = end.format("YYYY-MM-DD");
      const prevFromDate = prevStart.format("YYYY-MM-DD");
      const prevToDate = prevEnd.format("YYYY-MM-DD");
      const trendFrom = dayjs().subtract(29, "day").format("YYYY-MM-DD");
      const trendTo = dayjs().format("YYYY-MM-DD");
      const packageFrom = dayjs().subtract(6, "day").format("YYYY-MM-DD");

      const monthlyRankingsPromise =
        periodKey === "month"
          ? getMonthlyRankings({ month: dayjs().format("YYYY-MM") })
          : Promise.resolve(null);

      const financialSnapshotPromise = includeFinancialSnapshots
        ? Promise.all([
            getReportBySlug("profit", { from_date: fromDate, to_date: toDate }),
            getReportBySlug("profit", { from_date: prevFromDate, to_date: prevToDate }),
            getReportBySlug("reconciliation"),
            getReportBySlug("package-liability"),
            getBalanceSheetReport({ as_of: dayjs().format("YYYY-MM-DD") }),
          ])
        : Promise.resolve([null, null, null, null, null]);

      const [
        summaryRes,
        trendRes,
        popularityRes,
        packageRes,
        followUpsRes,
        visitsRes,
        alertsRes,
        financialSnapshots,
        monthlyRankingsRes,
      ] = await Promise.all([
        getOperationalSummary({ period: periodKey }),
        getTreatmentTrend({ from_date: trendFrom, to_date: trendTo }),
        getTreatmentPopularity({ from_date: fromDate, to_date: toDate }),
        getPackagePurchases({ from_date: packageFrom, to_date: trendTo }),
        listFollowUpTasks(),
        getVisits(),
        getInventoryAlerts({ days: 90 }),
        financialSnapshotPromise,
        monthlyRankingsPromise,
      ]);

      const [
        profitCurrentRes,
        profitPreviousRes,
        reconciliationRes,
        packageLiabilityRes,
        balanceSheetRes,
      ] = financialSnapshots ?? [null, null, null, null, null];

      setRawData({
        summary: summaryRes,
        treatmentTrend: trendRes,
        treatmentPopularity: popularityRes,
        packagePurchases: packageRes,
        monthlyRankings: monthlyRankingsRes,
        profitCurrent: profitCurrentRes,
        profitPrevious: profitPreviousRes,
        reconciliation: reconciliationRes,
        packageLiabilityRows: packageLiabilityRes,
        balanceSheet: balanceSheetRes,
        followUps: normalizeArrayResponse(followUpsRes),
        visits: normalizeArrayResponse(visitsRes),
        alerts: alertsRes ?? { low_stock: [] },
      });
    } catch {
      setError("Unable to load dashboard metrics.");
      setRawData({
        summary: null,
        treatmentTrend: null,
        treatmentPopularity: null,
        packagePurchases: null,
        monthlyRankings: null,
        profitCurrent: null,
        profitPrevious: null,
        reconciliation: null,
        packageLiabilityRows: null,
        balanceSheet: null,
        followUps: [],
        visits: [],
        alerts: { low_stock: [] },
      });
    } finally {
      setLoading(false);
    }
  }, [periodKey, includeFinancialSnapshots]);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(() => buildMetrics({ ...rawData, periodKey }), [rawData, periodKey]);

  return { loading, error, metrics, reload: load };
}
