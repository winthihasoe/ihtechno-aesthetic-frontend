import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { getAppointments } from "../../services/appointmentService";
import { getInventoryAlerts } from "../inventory/inventoryService";
import { getVisits } from "../../services/visitService";
import {
  getVisitStatusConfig,
  normalizeVisitStatus,
} from "../../utils/visitStatuses";
import {
  buildDemoLabWeekly,
  buildDemoPackageWeekly,
  buildDemoPharmacyWeekly,
  buildDemoRevenueTrend,
  buildDemoServicePopularity,
  buildDemoVisitTrend,
} from "./dashboardConfig";

const COMPLETED_STATUSES = new Set(["completed"]);
const PIPELINE_ORDER = [
  "waiting",
  "consulting",
  "preparation",
  "treatment",
  "payment",
];

function normalizeArrayResponse(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

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

function getPreviousRange(periodKey, currentStart) {
  if (periodKey === "month") {
    return {
      start: currentStart.subtract(1, "month"),
      end: currentStart.subtract(1, "day").endOf("day"),
    };
  }
  if (periodKey === "week") {
    return {
      start: currentStart.subtract(1, "week"),
      end: currentStart.subtract(1, "day").endOf("day"),
    };
  }
  return {
    start: currentStart.subtract(1, "day").startOf("day"),
    end: currentStart.subtract(1, "day").endOf("day"),
  };
}

function inRange(value, start, end) {
  if (!value) return false;
  const dt = dayjs(value);
  if (!dt.isValid()) return false;
  return (dt.isAfter(start) || dt.isSame(start)) && (dt.isBefore(end) || dt.isSame(end));
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

function formatDisplayDateTime(value) {
  const dt = dayjs(value);
  if (!dt.isValid()) return "—";
  return dt.format("DD-MM-YYYY HH:mm");
}

function patientName(visitOrAppt) {
  return (
    visitOrAppt.patient?.name ??
    visitOrAppt.patient_name ??
    visitOrAppt.patientName ??
    "Unknown patient"
  );
}

function countUniquePatientsInVisitRange(visits, start, end) {
  const inVisits = visits.filter((visit) =>
    inRange(visit.visited_at ?? visit.created_at, start, end),
  );
  const ids = new Set();
  inVisits.forEach((visit) => {
    const pid = visit.patient?.id ?? visit.patient_id;
    if (pid != null && pid !== "") ids.add(String(pid));
  });
  return ids.size;
}

function buildVisitPipeline(activeVisits) {
  const counts = Object.fromEntries(PIPELINE_ORDER.map((key) => [key, 0]));
  activeVisits.forEach((visit) => {
    const status = normalizeVisitStatus(visit.status);
    if (status in counts) counts[status] += 1;
  });
  const total = PIPELINE_ORDER.reduce((sum, key) => sum + counts[key], 0);
  return PIPELINE_ORDER.map((key) => {
    const cfg = getVisitStatusConfig(key);
    return {
      key,
      label: cfg.label,
      value: counts[key],
      pct: total > 0 ? Math.round((counts[key] / total) * 100) : 0,
      color: cfg.textColor,
      chipColor: cfg.chipColor,
    };
  });
}

function buildRecentVisits(visits) {
  return [...visits]
    .sort((a, b) => {
      const aTime = dayjs(a.visited_at ?? a.updated_at ?? a.created_at).valueOf();
      const bTime = dayjs(b.visited_at ?? b.updated_at ?? b.created_at).valueOf();
      return bTime - aTime;
    })
    .slice(0, 8)
    .map((visit) => {
      const status = normalizeVisitStatus(visit.status);
      const cfg = getVisitStatusConfig(status);
      return {
        id: visit.id,
        patient: patientName(visit),
        doctor: visit.doctor?.name ?? visit.doctor_name ?? "—",
        status,
        statusLabel: cfg.label,
        statusColor: cfg.chipColor,
        statusTextColor: cfg.textColor,
        amount: Number(visit.paymentAmount ?? visit.payment?.amount ?? 0),
        at: formatDisplayDateTime(visit.visited_at ?? visit.updated_at ?? visit.created_at),
      };
    });
}

function buildUpcomingAppointments(appointments) {
  const now = dayjs();
  return appointments
    .filter((item) => {
      const at = dayjs(item.scheduled_at);
      if (!at.isValid()) return false;
      if (["cancelled", "no_show", "completed"].includes(item.status)) return false;
      return at.isAfter(now) || at.isSame(now, "day");
    })
    .sort((a, b) => dayjs(a.scheduled_at).valueOf() - dayjs(b.scheduled_at).valueOf())
    .slice(0, 8)
    .map((item) => ({
      id: item.id,
      patient: patientName(item),
      doctor: item.doctor?.name ?? item.doctor_name ?? "—",
      status: item.status ?? "pending",
      at: formatDisplayDateTime(item.scheduled_at),
      reason: item.reason ?? item.notes ?? item.type ?? "Consultation",
    }));
}

function buildAppointmentStatusMix(appointmentsInRange) {
  const buckets = [
    { key: "pending", label: "Pending" },
    { key: "confirmed", label: "Confirmed" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
    { key: "no_show", label: "No-show" },
  ];
  const counts = Object.fromEntries(buckets.map((b) => [b.key, 0]));
  appointmentsInRange.forEach((item) => {
    const status = item.status ?? "pending";
    if (status in counts) counts[status] += 1;
    else counts.pending += 1;
  });
  return buckets
    .map((b) => ({ ...b, value: counts[b.key] }))
    .filter((b) => b.value > 0);
}

function buildLowStockList(alerts) {
  const rows = Array.isArray(alerts?.low_stock) ? alerts.low_stock : [];
  return rows.slice(0, 6).map((item, index) => ({
    id: item.id ?? item.product_id ?? `stock-${index}`,
    name: item.name ?? item.product_name ?? "Unknown product",
    sku: item.sku ?? item.code ?? "—",
    qty: item.quantity ?? item.stock_qty ?? item.qty ?? 0,
    status: item.stock_status === "out" ? "out" : "low",
  }));
}

function buildMetrics({ appointments, visits, alerts, periodKey }) {
  const { start, end } = getPeriodRange(periodKey);
  const previous = getPreviousRange(periodKey, start);
  const appointmentsInRange = appointments.filter((item) =>
    inRange(item.scheduled_at, start, end),
  );
  const previousAppointments = appointments.filter((item) =>
    inRange(item.scheduled_at, previous.start, previous.end),
  );

  const countByStatus = (collection, status) =>
    collection.filter((item) => item.status === status).length;
  const booked = appointmentsInRange.length;
  const completed = countByStatus(appointmentsInRange, "completed");
  const cancelled = countByStatus(appointmentsInRange, "cancelled");
  const noShow = countByStatus(appointmentsInRange, "no_show");

  const lowStock = Array.isArray(alerts?.low_stock) ? alerts.low_stock.length : 0;
  const outOfStock = Array.isArray(alerts?.low_stock)
    ? alerts.low_stock.filter((item) => item.stock_status === "out").length
    : 0;

  const activeVisits = visits.filter((visit) => !COMPLETED_STATUSES.has(normalizeVisitStatus(visit.status)));
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
        role: "Clinician",
        name: therapist.name,
        count: (workloadMap.get(key)?.count ?? 0) + 1,
      });
    });
  });

  const staffWorkload = Array.from(workloadMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const queueItems = [
    {
      key: "out_of_stock",
      label: "Out of stock products",
      value: outOfStock,
      path: "inventory",
      severity: "error",
    },
    {
      key: "low_stock",
      label: "Low stock products",
      value: lowStock,
      path: "inventory",
      severity: "warning",
    },
    {
      key: "pending_appointments",
      label: "Pending appointments",
      value: countByStatus(appointmentsInRange, "pending"),
      path: "appointments",
      severity: "info",
    },
    {
      key: "waiting_patients",
      label: "Patients waiting",
      value: activeVisits.filter((v) => normalizeVisitStatus(v.status) === "waiting").length,
      path: "visit-history",
      severity: "warning",
    },
    {
      key: "billing_queue",
      label: "Awaiting payment",
      value: activeVisits.filter((v) => normalizeVisitStatus(v.status) === "payment").length,
      path: "payments",
      severity: "error",
    },
  ].filter((item) => item.value > 0);

  const revenueInRange = visits
    .filter((visit) => normalizeVisitStatus(visit.status) === "completed")
    .filter((visit) => inRange(visit.updated_at ?? visit.created_at, start, end))
    .reduce((sum, visit) => sum + Number(visit.paymentAmount ?? visit.payment?.amount ?? 0), 0);
  const previousRevenue = visits
    .filter((visit) => normalizeVisitStatus(visit.status) === "completed")
    .filter((visit) =>
      inRange(visit.updated_at ?? visit.created_at, previous.start, previous.end),
    )
    .reduce((sum, visit) => sum + Number(visit.paymentAmount ?? visit.payment?.amount ?? 0), 0);

  const uniquePatients = countUniquePatientsInVisitRange(visits, start, end);
  const uniquePatientsPrev = countUniquePatientsInVisitRange(visits, previous.start, previous.end);

  const completedVisitsInRange = visits.filter(
    (visit) =>
      normalizeVisitStatus(visit.status) === "completed" &&
      inRange(visit.updated_at ?? visit.created_at, start, end),
  ).length;
  const previousCompletedVisits = visits.filter(
    (visit) =>
      normalizeVisitStatus(visit.status) === "completed" &&
      inRange(visit.updated_at ?? visit.created_at, previous.start, previous.end),
  ).length;

  const avgTicket =
    completedVisitsInRange > 0 ? Math.round(revenueInRange / completedVisitsInRange) : 0;

  return {
    periodKey,
    kpis: {
      uniquePatients: {
        value: uniquePatients,
        trend: formatTrend(uniquePatients, uniquePatientsPrev),
      },
      revenue: {
        value: revenueInRange,
        trend: formatTrend(revenueInRange, previousRevenue),
      },
      appointmentsBooked: {
        value: booked,
        trend: formatTrend(booked, previousAppointments.length),
      },
      completedVisits: {
        value: completedVisitsInRange,
        trend: formatTrend(completedVisitsInRange, previousCompletedVisits),
      },
      avgTicket: {
        value: avgTicket,
      },
      activeOnFloor: activeVisits.length,
    },
    appointmentMix: {
      booked,
      completed,
      cancelled,
      noShow,
    },
    appointmentStatusMix: buildAppointmentStatusMix(appointmentsInRange),
    visitPipeline: buildVisitPipeline(activeVisits),
    inventory: { lowStock, outOfStock },
    lowStockList: buildLowStockList(alerts),
    pendingActions: queueItems,
    staffWorkload,
    recentVisits: buildRecentVisits(visits),
    upcomingAppointments: buildUpcomingAppointments(appointments),
    charts: {
      visitTrend: buildDemoVisitTrend(),
      revenueTrend: buildDemoRevenueTrend(),
      servicePopularity: buildDemoServicePopularity(),
      packageWeekly: buildDemoPackageWeekly(),
      labWeekly: buildDemoLabWeekly(),
      pharmacyWeekly: buildDemoPharmacyWeekly(),
    },
  };
}

export default function useDashboardMetrics(periodKey) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rawData, setRawData] = useState({
    appointments: [],
    visits: [],
    alerts: { low_stock: [] },
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [appointmentsRes, visitsRes, alertsRes] = await Promise.all([
        getAppointments(),
        getVisits(),
        getInventoryAlerts({ days: 90 }),
      ]);

      setRawData({
        appointments: normalizeArrayResponse(appointmentsRes),
        visits: normalizeArrayResponse(visitsRes),
        alerts: alertsRes ?? { low_stock: [] },
      });
    } catch {
      setError("Unable to load dashboard metrics.");
      setRawData({
        appointments: [],
        visits: [],
        alerts: { low_stock: [] },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const metrics = useMemo(
    () => buildMetrics({ ...rawData, periodKey }),
    [rawData, periodKey],
  );

  return { loading, error, metrics, reload: load };
}
