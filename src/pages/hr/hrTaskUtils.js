const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

export const PRIORITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export function priorityCardSx(priority, theme) {
  const palette = {
    high: {
      bgcolor: theme.palette.error.main,
      color: theme.palette.error.contrastText,
      borderColor: theme.palette.error.dark,
    },
    medium: {
      bgcolor: theme.palette.warning.main,
      color: theme.palette.warning.contrastText,
      borderColor: theme.palette.warning.dark,
    },
    low: {
      bgcolor: theme.palette.info.light,
      color: theme.palette.info.contrastText,
      borderColor: theme.palette.info.main,
    },
  };

  return palette[priority] || palette.medium;
}

export function formatHrTaskDueDateTime(task) {
  if (!task?.due_date) return null;

  const date = new Date(task.due_date);
  if (Number.isNaN(date.getTime())) return null;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const datePart = `${day}-${month}-${year}`;

  if (!task.due_time) return datePart;

  const [hours, minutes] = String(task.due_time).split(":");
  return `${datePart} ${hours}:${minutes}`;
}

export function sortHrTasksByDueDate(tasks) {
  return [...tasks].sort((a, b) => {
    const priorityDiff =
      (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
    if (priorityDiff !== 0) return priorityDiff;

    const aDue = buildDueTimestamp(a);
    const bDue = buildDueTimestamp(b);
    if (aDue === bDue) return 0;
    if (aDue == null) return 1;
    if (bDue == null) return -1;
    return aDue - bDue;
  });
}

function buildDueTimestamp(task) {
  if (!task?.due_date) return null;
  const time = task.due_time ? `${task.due_time}:00` : "23:59:59";
  const stamp = new Date(`${task.due_date}T${time}`);
  return Number.isNaN(stamp.getTime()) ? null : stamp.getTime();
}
