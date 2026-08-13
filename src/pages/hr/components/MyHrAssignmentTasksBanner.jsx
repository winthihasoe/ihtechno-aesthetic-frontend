import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Box, Card, CircularProgress, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useAuthStore from "../../../stores/authStore";
import { hasPermission } from "../../../utils/accessUtils";
import { getFirstSidebarPath } from "../../../utils/roleUtils";
import { getHrTasks } from "../../../services/hrService";
import { resolveApiError } from "../../../services/apiClient";
import {
  formatHrTaskDueDateTime,
  priorityCardSx,
  PRIORITY_LABELS,
  sortHrTasksByDueDate,
} from "../hrTaskUtils";

function normalizePath(path) {
  if (!path) return "";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

export default function MyHrAssignmentTasksBanner() {
  const theme = useTheme();
  const { pathname } = useLocation();
  const user = useAuthStore((state) => state.user);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canView =
    hasPermission(user, "hr.self_service") || hasPermission(user, "hr.view");

  const entryPath = normalizePath(getFirstSidebarPath(user));
  const isEntryPage = normalizePath(pathname) === entryPath;

  const load = useCallback(async () => {
    if (!canView || !isEntryPage) return;
    setLoading(true);
    setError("");
    try {
      const res = await getHrTasks({ mine: 1, active_only: 1 });
      const rows = Array.isArray(res?.data) ? res.data : [];
      setTasks(sortHrTasksByDueDate(rows));
    } catch (loadError) {
      setTasks([]);
      setError(resolveApiError(loadError, "Failed to load assigned tasks."));
    } finally {
      setLoading(false);
    }
  }, [canView, isEntryPage]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleTasks = useMemo(
    () => tasks.filter((task) => task.status !== "done"),
    [tasks],
  );

  if (!canView || !isEntryPage) return null;

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 1.5, mb: 2 }}>
        <CircularProgress size={22} />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography variant="body2" color="error" sx={{ mb: 2 }}>
        {error}
      </Typography>
    );
  }

  if (visibleTasks.length === 0) return null;

  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        My assigned tasks
      </Typography>
      <Stack spacing={1}>
        {visibleTasks.map((task) => {
          const colors = priorityCardSx(task.priority, theme);
          const dueLabel = formatHrTaskDueDateTime(task);

          return (
            <Card
              key={task.id}
              variant="outlined"
              sx={{
                py: 1.25,
                px: 2,
                borderRadius: 1,
                bgcolor: colors.bgcolor,
                color: colors.color,
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={0.5}
                justifyContent="space-between"
                alignItems={{ sm: "center" }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {task.title}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.95 }}>
                  {PRIORITY_LABELS[task.priority] || "Medium"}
                  {dueLabel ? ` · Due ${dueLabel}` : ""}
                </Typography>
              </Stack>
            </Card>
          );
        })}
      </Stack>
    </Box>
  );
}
