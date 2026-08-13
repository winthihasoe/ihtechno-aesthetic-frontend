/** Aesthetic clinic visit lifecycle (waiting → consultation → pre-treatment → treatment → billing). */

export const VISIT_STATUS_CONFIG = {
  waiting: {
    label: "Waiting",
    color: "warning",
    chipColor: "#FEF3C7",
    textColor: "#92400E",
  },
  consulting: {
    label: "In Consultation",
    color: "info",
    chipColor: "#DBEAFE",
    textColor: "#1E3A8A",
  },
  preparation: {
    label: "Pre-treatment",
    color: "primary",
    chipColor: "#E0F2FE",
    textColor: "#075985",
  },
  treatment: {
    label: "Treatment",
    color: "secondary",
    chipColor: "#ECFDF5",
    textColor: "#047857",
  },
  payment: {
    label: "Billing",
    color: "error",
    chipColor: "#FEE2E2",
    textColor: "#991B1B",
  },
  completed: {
    label: "Completed",
    color: "success",
    chipColor: "#D1FAE5",
    textColor: "#065F46",
  },
  cancelled: {
    label: "Cancelled",
    color: "default",
    chipColor: "#F3F4F6",
    textColor: "#4B5563",
  },
};

/** Legacy hospital OPD statuses mapped for older records still in storage. */
export const LEGACY_VISIT_STATUS_ALIASES = {
  lab: "preparation",
  pharmacy: "treatment",
};

export const VISIT_STATUS_FILTER_OPTIONS = [
  { value: "", label: "All statuses" },
  ...Object.entries(VISIT_STATUS_CONFIG).map(([value, cfg]) => ({
    value,
    label: cfg.label,
  })),
];

export function normalizeVisitStatus(status) {
  if (!status) return status;
  return LEGACY_VISIT_STATUS_ALIASES[status] ?? status;
}

export function getVisitStatusConfig(status) {
  const normalized = normalizeVisitStatus(status);
  return (
    VISIT_STATUS_CONFIG[normalized] ?? {
      label: normalized?.replace(/_/g, " ") ?? "—",
      chipColor: "#F3F4F6",
      textColor: "#374151",
    }
  );
}
