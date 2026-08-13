import dayjs from "dayjs";

export const DASHBOARD_PERIODS = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

export const DASHBOARD_ROLE_VARIANTS = {
  owner: {
    title: "Clinic dashboard",
    subtitle: "Visit volume, revenue, pipeline, and stock in one view",
    pendingActionsLabel: "Needs attention",
    workloadLabel: "Clinician workload",
  },
  admin: {
    title: "Admin dashboard",
    subtitle: "Operational snapshot across visits, billing, and inventory",
    pendingActionsLabel: "Needs attention",
    workloadLabel: "Clinician workload",
  },
};

/** Deterministic demo: visit volume over 30 days. */
export function buildDemoVisitTrend() {
  const out = [];
  for (let i = 0; i < 30; i += 1) {
    const d = dayjs().subtract(29 - i, "day");
    const wobble = Math.round(10 * Math.sin(i / 4.2) + 6 * Math.cos(i / 6));
    const base = 38 + ((i * 11) % 21);
    out.push({
      key: d.format("YYYY-MM-DD"),
      shortLabel: d.format("D"),
      tooltipLabel: d.format("DD-MM-YYYY"),
      value: Math.max(14, base + wobble),
    });
  }
  return out;
}

/** Deterministic demo: daily revenue index (kyat thousands). */
export function buildDemoRevenueTrend() {
  const out = [];
  for (let i = 0; i < 30; i += 1) {
    const d = dayjs().subtract(29 - i, "day");
    const wobble = Math.round(18 * Math.sin(i / 3.8) + 10 * Math.cos(i / 5.5));
    const base = 120 + ((i * 17) % 55);
    out.push({
      key: d.format("YYYY-MM-DD"),
      shortLabel: d.format("D"),
      tooltipLabel: d.format("DD-MM-YYYY"),
      value: Math.max(40, base + wobble),
    });
  }
  return out;
}

/** Demo: common aesthetic services / consult types by volume. */
export function buildDemoServicePopularity() {
  return [
    { key: "consult", label: "Initial Consultation", value: 96 },
    { key: "laser", label: "Laser Facial", value: 72 },
    { key: "botox", label: "Botox", value: 58 },
    { key: "peel", label: "Chemical Peel", value: 47 },
    { key: "iv", label: "IV Drip", value: 34 },
  ];
}

/** Demo: care-package redemptions last 7 days. */
export function buildDemoPackageWeekly() {
  const out = [];
  for (let i = 0; i < 7; i += 1) {
    const d = dayjs().subtract(6 - i, "day");
    const v = 22 + ((i * 13 + 5) % 18) + Math.round(5 * Math.sin(i / 1.7));
    out.push({
      key: d.format("YYYY-MM-DD"),
      shortLabel: d.format("ddd"),
      value: Math.max(8, v),
    });
  }
  return out;
}

/** Demo: pre-treatment-stage visits completed vs pending by weekday. */
export function buildDemoLabWeekly() {
  const out = [];
  for (let i = 0; i < 7; i += 1) {
    const d = dayjs().subtract(6 - i, "day");
    const completed = 14 + ((i * 7 + 3) % 12);
    const pending = 4 + ((i * 5 + 1) % 8);
    out.push({
      key: d.format("YYYY-MM-DD"),
      shortLabel: d.format("ddd"),
      completed,
      pending,
    });
  }
  return out;
}

/** Demo: treatment-room volume (last 7 days). */
export function buildDemoPharmacyWeekly() {
  const out = [];
  for (let i = 0; i < 7; i += 1) {
    const d = dayjs().subtract(6 - i, "day");
    const v = 32 + ((i * 9 + 4) % 20) + Math.round(4 * Math.cos(i / 1.4));
    out.push({
      key: d.format("YYYY-MM-DD"),
      shortLabel: d.format("ddd"),
      value: Math.max(16, v),
    });
  }
  return out;
}
