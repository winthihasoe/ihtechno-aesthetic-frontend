import { useCallback, useEffect, useMemo, useState } from "react";
import AssignmentAddIcon from "@mui/icons-material/AssignmentAdd";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import { useTheme } from "@mui/material/styles";
import HrPageShell from "./components/HrPageShell";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import useConfirmStore from "../../stores/confirmStore";
import {
  createHrTask,
  deleteHrTask,
  getHrTasks,
  getStaffs,
  updateHrTask,
} from "../../services/hrService";
import {
  formatHrTaskDueDateTime,
  priorityCardSx,
  PRIORITY_LABELS,
} from "./hrTaskUtils";

const statuses = ["todo", "in_progress", "done"];

const STATUS_LABELS = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

const EMPTY_FORM = {
  title: "",
  assigneeId: "",
  dueDate: "",
  dueTime: "",
  priority: "medium",
};

export default function HrAssignmentsPage() {
  const theme = useTheme();
  const { pushToast } = useToastStore();
  const { askConfirm } = useConfirmStore();
  const [tasks, setTasks] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const grouped = useMemo(
    () =>
      statuses.map((status) => ({
        status,
        label: STATUS_LABELS[status],
        rows: tasks.filter((task) => task.status === status),
      })),
    [tasks],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getHrTasks();
      setTasks(res.data || []);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to load tasks."),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    getStaffs()
      .then(setStaffs)
      .catch((error) => {
        pushToast({
          message: resolveApiError(error, "Failed to load staff list."),
          severity: "error",
        });
      });
  }, [load, pushToast]);

  const openAddDialog = () => {
    setForm(EMPTY_FORM);
    setOpenCreate(true);
  };

  const closeAddDialog = () => {
    setOpenCreate(false);
    setForm(EMPTY_FORM);
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await createHrTask({
        title: form.title.trim(),
        assignee_id: Number(form.assigneeId),
        due_date: form.dueDate,
        due_time: form.dueTime || null,
        priority: form.priority,
      });
      pushToast({ message: "Task created.", severity: "success" });
      closeAddDialog();
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to create task."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await updateHrTask(taskId, { status });
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to update task."),
        severity: "error",
      });
    }
  };

  const handleDelete = async (task) => {
    const approved = await askConfirm({
      title: "Delete task?",
      message: `Remove "${task.title}" from the board?`,
      confirmText: "Delete",
    });
    if (!approved) return;

    setDeletingId(task.id);
    try {
      await deleteHrTask(task.id);
      pushToast({ message: "Task deleted.", severity: "success" });
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to delete task."),
        severity: "error",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const canSubmit =
    Boolean(form.title.trim()) &&
    Boolean(form.assigneeId) &&
    Boolean(form.dueDate) &&
    Boolean(form.dueTime);

  return (
    <HrPageShell
      title="HR Module"
      subtitle="Assignment - Task board"
      actions={
        !loading && tasks.length > 0 ? (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openAddDialog}
          >
            Add task
          </Button>
        ) : null
      }
    >
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : null}

      {!loading && tasks.length === 0 ? (
        <AssignmentsEmptyState onAddTask={openAddDialog} />
      ) : null}

      {!loading && tasks.length > 0 ? (
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          {grouped.map((col) => (
            <Card key={col.status} variant="outlined" sx={{ p: 1.5, flex: 1 }}>
              <Typography fontWeight={700} sx={{ mb: 1 }}>
                {col.label}
              </Typography>
              <Stack spacing={1}>
                {col.rows.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No tasks
                  </Typography>
                ) : null}
                {col.rows.map((task) => {
                  const dueLabel = formatHrTaskDueDateTime(task);
                  const colors = priorityCardSx(task.priority, theme);

                  return (
                    <Card
                      key={task.id}
                      variant="outlined"
                      sx={{
                        p: 2,
                        bgcolor: colors.bgcolor,
                        color: colors.color,
                        borderColor: colors.borderColor,
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        spacing={0.5}
                      >
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography fontWeight={600}>{task.title}</Typography>
                          <Typography
                            variant="caption"
                            sx={{ opacity: 0.95 }}
                            display="block"
                          >
                            {task.assignee?.name || "Unassigned"}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{ opacity: 0.95 }}
                            display="block"
                          >
                            {PRIORITY_LABELS[task.priority] || "Medium"}
                            {dueLabel ? ` · Due ${dueLabel}` : ""}
                          </Typography>
                        </Box>
                        <Tooltip title="Delete task">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(task)}
                              disabled={deletingId === task.id}
                              sx={{ color: "inherit", opacity: 0.9 }}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Stack>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        mt={0.5}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        {statuses
                          .filter((status) => status !== task.status)
                          .map((status) => (
                            <Button
                              key={status}
                              size="small"
                              variant="outlined"
                              onClick={() =>
                                handleStatusChange(task.id, status)
                              }
                              sx={{
                                color: "inherit",
                                borderColor: "currentColor",
                                minWidth: 0,
                              }}
                            >
                              {STATUS_LABELS[status]}
                            </Button>
                          ))}
                      </Stack>
                    </Card>
                  );
                })}
              </Stack>
            </Card>
          ))}
        </Stack>
      ) : null}

      <Dialog
        open={openCreate}
        onClose={closeAddDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add task</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Task title"
              value={form.title}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, title: e.target.value }))
              }
              fullWidth
            />
            <TextField
              select
              label="Assignee"
              value={form.assigneeId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, assigneeId: e.target.value }))
              }
              fullWidth
            >
              {staffs.map((staff) => (
                <MenuItem key={staff.id} value={staff.id}>
                  {staff.name}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                type="date"
                label="Due date"
                InputLabelProps={{ shrink: true }}
                value={form.dueDate}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, dueDate: e.target.value }))
                }
                fullWidth
              />
              <TextField
                type="time"
                label="Due time"
                InputLabelProps={{ shrink: true }}
                value={form.dueTime}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, dueTime: e.target.value }))
                }
                fullWidth
              />
            </Stack>
            <FormControl>
              <FormLabel>Priority</FormLabel>
              <RadioGroup
                row
                value={form.priority}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, priority: e.target.value }))
                }
              >
                <FormControlLabel value="low" control={<Radio />} label="Low" />
                <FormControlLabel
                  value="medium"
                  control={<Radio />}
                  label="Medium"
                />
                <FormControlLabel
                  value="high"
                  control={<Radio />}
                  label="High"
                />
              </RadioGroup>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeAddDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!canSubmit || saving}
            onClick={handleCreate}
          >
            {saving ? "Adding..." : "Add task"}
          </Button>
        </DialogActions>
      </Dialog>
    </HrPageShell>
  );
}

function AssignmentsEmptyState({ onAddTask }) {
  return (
    <Box
      sx={{
        p: 3,
        textAlign: "center",
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <AssignmentAddIcon
        sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
      />
      <Typography variant="h6" fontWeight={700} gutterBottom>
        No tasks on the board yet
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 520, mx: "auto", mb: 2 }}
      >
        The assignment board is HR&apos;s shared task list for clinic work —
        onboarding checklists, policy follow-ups, document requests, and other
        items that need an owner and a deadline.
      </Typography>
      <Stack
        spacing={0.75}
        sx={{
          maxWidth: 480,
          mx: "auto",
          textAlign: "left",
          mb: 2,
          px: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          <strong>Create tasks:</strong> Add a title, assign a staff member, set
          priority, and choose due date and time. New tasks start in{" "}
          <em>To do</em>.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Track progress:</strong> Move cards across <em>To do</em>,{" "}
          <em>In progress</em>, and <em>Done</em> as work advances.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Assign ownership:</strong> Each task has one assignee. Active
          tasks appear at the top of that person&apos;s entry page as colored
          cards by priority.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Plan deadlines:</strong> Due date and time help prioritize
          follow-ups before payroll, audits, or staff events.
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1} justifyContent="center" sx={{ mb: 1 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onAddTask}>
          Add task
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block">
        After tasks are added, the kanban columns stay visible and you can add
        more from the header.
      </Typography>
    </Box>
  );
}
