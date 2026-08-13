import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import HrPageShell from "./components/HrPageShell";
import RichTextEditor from "../../components/common/RichTextEditor";
import {
  createJobPosition,
  deleteJobPosition,
  getJobPositions,
  updateJobPosition,
} from "../../services/hrService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import useConfirmStore from "../../stores/confirmStore";

const emptyForm = () => ({
  title: "",
  description: "",
});

export default function JobPositionsPage() {
  const { pushToast } = useToastStore();
  const { askConfirm } = useConfirmStore();
  const [rows, setRows] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getJobPositions();
      setRows(data || []);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to load job positions."),
        severity: "error",
      });
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setForm({
      title: row.title || "",
      description: row.description || "",
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm());
  };

  const save = async () => {
    if (!form.title.trim()) {
      pushToast({ message: "Title is required.", severity: "warning" });
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await updateJobPosition(editing.id, {
          title: form.title.trim(),
          description: form.description || null,
        });
        pushToast({ message: "Job position updated.", severity: "success" });
      } else {
        await createJobPosition({
          title: form.title.trim(),
          description: form.description || null,
        });
        pushToast({ message: "Job position created.", severity: "success" });
      }
      closeDialog();
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to save job position."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row) => {
    const confirmed = await askConfirm({
      title: "Delete job position",
      message: `Delete "${row.title}"? Staff must be reassigned first if any are linked.`,
      confirmLabel: "Delete",
      confirmColor: "error",
    });
    if (!confirmed) return;

    try {
      await deleteJobPosition(row.id);
      pushToast({ message: "Job position deleted.", severity: "success" });
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to delete job position."),
        severity: "error",
      });
    }
  };

  return (
    <HrPageShell title="HR Module" subtitle="Job positions">
      <Stack spacing={2}>
        <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1.5}
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Job Position Templates
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Reusable job descriptions assigned to staff profiles. Staff can override per person.
              </Typography>
            </Box>
            <Button variant="contained" onClick={openCreate}>
              Add position
            </Button>
          </Stack>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Staff assigned</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography variant="body2" color="text.secondary">
                        No job positions yet.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="body2" fontWeight={600}>
                            {row.title}
                          </Typography>
                          {!row.is_active ? (
                            <Chip size="small" label="Inactive" variant="outlined" />
                          ) : null}
                        </Stack>
                      </TableCell>
                      <TableCell>{row.staff_profiles_count ?? 0}</TableCell>
                      <TableCell align="right">
                        <IconButton size="small" onClick={() => openEdit(row)} aria-label="Edit">
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => remove(row)}
                          aria-label="Delete"
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Stack>

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editing ? "Edit job position" : "New job position"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="Title"
              size="small"
              fullWidth
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            />
            <RichTextEditor
              label="Job description"
              value={form.description}
              onChange={(html) => setForm((prev) => ({ ...prev, description: html }))}
              helperText="This template is used when staff have no custom override."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </HrPageShell>
  );
}
