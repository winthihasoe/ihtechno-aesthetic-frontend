import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  Card,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  Divider,
} from "@mui/material";
import LoadingIndicator from "../components/common/LoadingIndicator";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  getRoles,
  getPermissions,
  createRole,
  updateRole,
  deleteRole,
} from "../services/rolesService";
import { resolveApiError } from "../services/apiClient";
import useConfirmStore from "../stores/confirmStore";
import useToastStore from "../stores/toastStore";
import useAuthStore from "../stores/authStore";

const EMPTY_FORM = {
  name: "",
  description: "",
  permissionCodes: [],
};

const groupPermissions = (permissions) => {
  const grouped = permissions.reduce((acc, item) => {
    const key = item.group || "general";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});

  return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
};

export default function RolesPermissionsPage() {
  const { askConfirm } = useConfirmStore();
  const { pushToast } = useToastStore();
  const { user } = useAuthStore();

  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const permissionGroups = useMemo(
    () => groupPermissions(permissions),
    [permissions],
  );
  const visibleRoles = useMemo(
    () => roles.filter((role) => role.slug !== "developer"),
    [roles],
  );
  const isDeveloperUser =
    user?.role === "developer" ||
    user?.roles?.some((item) => item?.slug === "developer");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesData, permissionsData] = await Promise.all([
        getRoles(),
        getPermissions(),
      ]);

      setRoles(rolesData);
      setPermissions(permissionsData);
    } catch (error) {
      pushToast({
        message: resolveApiError(
          error,
          "Failed to load roles and permissions.",
        ),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditingRole(null);
    setForm(EMPTY_FORM);
    setOpenForm(true);
  };

  const openEdit = (role) => {
    setEditingRole(role);
    setForm({
      name: role.name || "",
      description: role.description || "",
      permissionCodes: (role.permissions || []).map((item) => item.code),
    });
    setOpenForm(true);
  };

  const togglePermission = (code) => {
    setForm((prev) => {
      const exists = prev.permissionCodes.includes(code);
      if (exists) {
        return {
          ...prev,
          permissionCodes: prev.permissionCodes.filter((item) => item !== code),
        };
      }

      return {
        ...prev,
        permissionCodes: [...prev.permissionCodes, code],
      };
    });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      pushToast({ message: "Role name is required.", severity: "error" });
      return;
    }

    if (form.permissionCodes.length === 0) {
      pushToast({
        message: "Select at least one permission.",
        severity: "error",
      });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        permission_codes: form.permissionCodes,
      };

      if (editingRole) {
        const updated = await updateRole(editingRole.id, payload);
        setRoles((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
        pushToast({ message: "Role updated.", severity: "success" });
      } else {
        const created = await createRole(payload);
        setRoles((prev) =>
          [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        pushToast({ message: "Role created.", severity: "success" });
      }

      setOpenForm(false);
      setEditingRole(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to save role."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role) => {
    const approved = await askConfirm({
      title: "Delete role",
      message: `Delete role ${role.name}?`,
      confirmText: "Delete",
    });

    if (!approved) {
      return;
    }

    try {
      await deleteRole(role.id);
      setRoles((prev) => prev.filter((item) => item.id !== role.id));
      pushToast({ message: "Role deleted.", severity: "success" });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to delete role."),
        severity: "error",
      });
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", sm: "row" },
          gap: 1.5,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5">Roles & Permissions</Typography>
          <Typography variant="body2" color="text.secondary">
            Define custom roles and select exactly what each role can do.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
        >
          New Role
        </Button>
      </Box>

      <Card sx={{ p: 2 }}>
        {loading ? (
          <Box sx={{ py: 5, display: "flex", justifyContent: "center" }}>
            <LoadingIndicator size={112} />
          </Box>
        ) : visibleRoles.length === 0 ? (
          <Typography color="text.secondary">No roles found.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {visibleRoles.map((role) => (
              <Card
                key={role.id}
                variant="outlined"
                sx={{
                  p: 1.5,
                  display: "flex",
                  gap: 1.5,
                  justifyContent: "space-between",
                  alignItems: { xs: "flex-start", sm: "center" },
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ flexWrap: "wrap" }}
                  >
                    <Typography variant="subtitle2">{role.name}</Typography>
                    {role.is_system && <Chip size="small" label="System" />}
                    <Chip
                      size="small"
                      variant="outlined"
                      label={`${role.users_count || 0} users`}
                    />
                  </Stack>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    {role.description || "No description"}
                  </Typography>
                  {!isDeveloperUser ? (
                    <Stack
                      direction="row"
                      spacing={0.75}
                      useFlexGap
                      flexWrap="wrap"
                      sx={{ mt: 1 }}
                    >
                      {(role.permissions || []).map((permission) => (
                        <Chip
                          key={permission.code}
                          size="small"
                          label={permission.name}
                        />
                      ))}
                    </Stack>
                  ) : null}
                </Box>

                <Stack direction="row" spacing={0.5}>
                  <Tooltip
                    title={
                      role.slug === "owner" || role.slug === "developer"
                        ? "Protected system role cannot be edited"
                        : "Edit role"
                    }
                  >
                    <span>
                      <IconButton
                        size="small"
                        disabled={
                          role.slug === "owner" || role.slug === "developer"
                        }
                        onClick={() => openEdit(role)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip
                    title={
                      role.slug === "owner" || role.slug === "developer"
                        ? "Protected system role cannot be deleted"
                        : role.is_system
                          ? "System role cannot be deleted"
                          : "Delete role"
                    }
                  >
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={
                          role.slug === "owner" ||
                          role.slug === "developer" ||
                          role.is_system
                        }
                        onClick={() => handleDelete(role)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              </Card>
            ))}
          </Stack>
        )}
      </Card>

      <Dialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>{editingRole ? "Edit Role" : "Create Role"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <TextField
              label="Role Name"
              size="small"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
            <TextField
              label="Description"
              size="small"
              multiline
              minRows={2}
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  description: event.target.value,
                }))
              }
            />

            <Divider />

            <Typography variant="subtitle2">Authorities</Typography>
            <Stack spacing={1.5}>
              {permissionGroups.map(([group, groupItems]) => (
                <Card key={group} variant="outlined" sx={{ p: 1.25 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ mb: 0.75, textTransform: "capitalize" }}
                  >
                    {group.replaceAll("_", " ")}
                  </Typography>
                  <Stack
                    direction="row"
                    useFlexGap
                    flexWrap="wrap"
                    sx={{ columnGap: 1.5, rowGap: 0.5 }}
                  >
                    {groupItems.map((permission) => (
                      <FormControlLabel
                        key={permission.code}
                        control={
                          <Checkbox
                            size="small"
                            checked={form.permissionCodes.includes(
                              permission.code,
                            )}
                            onChange={() => togglePermission(permission.code)}
                          />
                        }
                        label={permission.name}
                      />
                    ))}
                  </Stack>
                </Card>
              ))}
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={saving}>
            {editingRole ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
