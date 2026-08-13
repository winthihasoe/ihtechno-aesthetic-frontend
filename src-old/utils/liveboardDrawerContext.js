export const LIVEBOARD_DRAWER_CONTEXT_BY_STATUS = {
  waiting: "waiting",
  consulting: "consulting_brief",
  preparation: "preparation_brief",
  treatment: "treatment",
  payment: "payment",
  completed: "completed",
};

export function resolveLiveboardDrawerContext(visit) {
  return LIVEBOARD_DRAWER_CONTEXT_BY_STATUS[visit?.status] ?? "consulting";
}

export const CARRYOVER_CANCEL_REASONS = [
  "No-show / patient left",
  "Duplicate check-in",
  "Clinic closed incomplete",
  "Other",
];
