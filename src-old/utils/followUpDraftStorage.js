const storageKey = (taskId) => `dermafairy:followUp:v1:${taskId}`;

export function readFollowUpDraft(taskId) {
  if (taskId == null) return null;
  try {
    const raw = localStorage.getItem(storageKey(taskId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeFollowUpDraft(taskId, draft) {
  if (taskId == null) return;
  try {
    localStorage.setItem(
      storageKey(taskId),
      JSON.stringify({
        call_status: draft.call_status,
        feedback_status: draft.feedback_status,
        feedback: draft.feedback,
        due_date: draft.due_date,
      }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearFollowUpDraft(taskId) {
  if (taskId == null) return;
  try {
    localStorage.removeItem(storageKey(taskId));
  } catch {
    /* ignore */
  }
}
