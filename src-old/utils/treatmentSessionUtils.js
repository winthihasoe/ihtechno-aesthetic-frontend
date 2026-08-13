export const TREATMENT_APPROVAL_REQUIRED_MESSAGE =
  "All treatment sessions must be approved by a doctor or owner before moving this visit to payment.";

export function getTreatmentDoneBlockReason(sessions) {
  const list = Array.isArray(sessions) ? sessions : [];
  if (list.length === 0) {
    return "Add and complete at least one treatment session before moving this visit to payment.";
  }
  if (list.some((session) => session.status !== "completed")) {
    return "Finish each open treatment session before moving this visit to payment.";
  }
  if (list.some((session) => session.approval_status !== "approved")) {
    return TREATMENT_APPROVAL_REQUIRED_MESSAGE;
  }
  return "";
}

export function formatTreatmentSessionApprovalLabel(session) {
  if (session?.status !== "completed") {
    return session?.status === "in_progress" ? "In progress" : "Open";
  }
  if (session.approval_status === "approved") return "Approved";
  if (session.approval_status === "pending_approval") return "Pending approval";
  if (session.approval_status === "rejected") return "Rejected";
  return "Awaiting approval";
}
