import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  createDepartment,
  deleteDepartment,
  getDepartments,
  updateDepartment,
} from "../../../services/hrService";
import { resolveApiError } from "../../../services/apiClient";
import useToastStore from "../../../stores/toastStore";

export default function ManageDepartmentsDialog({ open, onClose, onChanged }) {
  const { pushToast } = useToastStore();
  const [departments, setDepartments] = useState([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    getDepartments()
      .then(setDepartments)
      .catch((error) => {
        pushToast({ message: resolveApiError(error, "Failed to load departments."), severity: "error" });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) {
      load();
    }
  }, [open]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      await createDepartment({ name });
      setNewName("");
      load();
      onChanged?.();
      pushToast({ message: "Department created.", severity: "success" });
    } catch (error) {
      pushToast({ message: resolveApiError(error, "Failed to create department."), severity: "error" });
    }
  };

  const handleSaveEdit = async (departmentId) => {
    const name = editingName.trim();
    if (!name) return;
    try {
      await updateDepartment(departmentId, { name });
      setEditingId(null);
      setEditingName("");
      load();
      onChanged?.();
      pushToast({ message: "Department updated.", severity: "success" });
    } catch (error) {
      pushToast({ message: resolveApiError(error, "Failed to update department."), severity: "error" });
    }
  };

  const handleDelete = async (department) => {
    try {
      await deleteDepartment(department.id);
      load();
      onChanged?.();
      pushToast({ message: "Department deleted.", severity: "success" });
    } catch (error) {
      pushToast({ message: resolveApiError(error, "Failed to delete department."), severity: "error" });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Manage Departments</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Stack direction="row" spacing={1}>
            <TextField
              size="small"
              fullWidth
              label="New department name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleCreate();
                }
              }}
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => void handleCreate()} disabled={!newName.trim()}>
              Add
            </Button>
          </Stack>

          {loading ? (
            <Typography variant="body2" color="text.secondary">
              Loading departments...
            </Typography>
          ) : null}

          {!loading && !departments.length ? (
            <Typography variant="body2" color="text.secondary">
              No departments yet.
            </Typography>
          ) : null}

          {departments.map((department) => (
            <Box
              key={department.id}
              sx={{
                p: 1.25,
                borderRadius: 1.5,
                border: 1,
                borderColor: "divider",
              }}
            >
              {editingId === department.id ? (
                <Stack direction="row" spacing={1}>
                  <TextField
                    size="small"
                    fullWidth
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                  />
                  <Button size="small" variant="contained" onClick={() => void handleSaveEdit(department.id)}>
                    Save
                  </Button>
                  <Button
                    size="small"
                    onClick={() => {
                      setEditingId(null);
                      setEditingName("");
                    }}
                  >
                    Cancel
                  </Button>
                </Stack>
              ) : (
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Box>
                    <Typography fontWeight={600}>{department.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {department.staff_profiles_count ?? 0} staff assigned
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <Button
                      size="small"
                      onClick={() => {
                        setEditingId(department.id);
                        setEditingName(department.name);
                      }}
                    >
                      Rename
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label={`Delete ${department.name}`}
                      onClick={() => void handleDelete(department)}
                      disabled={(department.staff_profiles_count ?? 0) > 0}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              )}
            </Box>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
