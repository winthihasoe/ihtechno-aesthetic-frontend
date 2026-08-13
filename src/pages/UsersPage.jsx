import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Stack,
  TextField,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import {
  getUsers,
  getAssignableRoles,
  createUser,
  updateUser,
  deleteUser,
} from "../services/usersService";
import { resolveApiError } from "../services/apiClient";
import useConfirmStore from "../stores/confirmStore";
import useToastStore from "../stores/toastStore";
import { hasRole } from "../utils/accessUtils";

const EMPTY_FORM = {
  name: "",
  email: "",
  roleIds: [],
  password: "",
};

const isDeveloperAccount = (user) =>
  user?.role === "developer" ||
  (user?.roles || []).some((role) => role?.slug === "developer");

export default function UsersPage() {
  const { askConfirm } = useConfirmStore();
  const { pushToast } = useToastStore();

  const [users, setUsers] = useState([]);
  const [assignableRoles, setAssignableRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [rolesSelectOpen, setRolesSelectOpen] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, rolesData] = await Promise.all([
        getUsers(),
        getAssignableRoles(),
      ]);
      setUsers(usersData);
      setAssignableRoles(rolesData);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to load users."),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const nonDeveloperUsers = users.filter((user) => !isDeveloperAccount(user));
    const query = search.trim().toLowerCase();
    if (!query) return nonDeveloperUsers;

    return nonDeveloperUsers.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.roles || []).some((role) =>
          role.name.toLowerCase().includes(query),
        ),
    );
  }, [users, search]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setOpenForm(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      roleIds: (user.roles || []).map((role) => role.id),
      password: "",
    });
    setOpenForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      pushToast({ message: "Name and email are required.", severity: "error" });
      return;
    }

    if (!editingUser && form.password.length < 8) {
      pushToast({
        message: "Password must be at least 8 characters.",
        severity: "error",
      });
      return;
    }

    if (form.roleIds.length === 0) {
      pushToast({
        message: "Select at least one role.",
        severity: "error",
      });
      return;
    }

    const currentRoleIds = (editingUser?.roles || [])
      .map((role) => role.id)
      .sort();
    const nextRoleIds = [...form.roleIds].sort();
    const roleChanged =
      editingUser &&
      JSON.stringify(currentRoleIds) !== JSON.stringify(nextRoleIds);

    if (roleChanged) {
      const currentRoleNames = (editingUser.roles || [])
        .map((role) => role.name)
        .join(", ");
      const nextRoleNames = assignableRoles
        .filter((role) => form.roleIds.includes(role.id))
        .map((role) => role.name)
        .join(", ");
      const approvedRole = await askConfirm({
        title: "Confirm role change",
        message: `Change roles for ${editingUser.name} from ${currentRoleNames || "none"} to ${nextRoleNames || "none"}?`,
        confirmText: "Change Roles",
      });
      if (!approvedRole) return;
    }

    const approved = await askConfirm({
      title: editingUser ? "Update user" : "Create user",
      message: editingUser
        ? "Apply changes to this user account?"
        : "Create this new user account?",
      confirmText: editingUser ? "Update" : "Create",
    });

    if (!approved) return;

    setSaving(true);
    try {
      if (editingUser) {
        const payload = {
          name: form.name,
          email: form.email,
          role_ids: form.roleIds,
        };

        if (form.password.trim()) {
          payload.password = form.password;
        }

        const updated = await updateUser(editingUser.id, payload);
        setUsers((prev) =>
          prev.map((user) => (user.id === updated.id ? updated : user)),
        );
        pushToast({
          message: "User updated successfully.",
          severity: "success",
        });
      } else {
        const created = await createUser({
          name: form.name,
          email: form.email,
          role_ids: form.roleIds,
          password: form.password,
        });
        setUsers((prev) =>
          [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        pushToast({
          message: "User created successfully.",
          severity: "success",
        });
      }

      setOpenForm(false);
      setForm(EMPTY_FORM);
      setEditingUser(null);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to save user."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    const approved = await askConfirm({
      title: "Deactivate user",
      message: `Deactivate ${user.name} (${getUserRoleNames(user) || "No roles"})? This user will no longer be able to log in.`,
      confirmText: "Deactivate",
    });

    if (!approved) return;

    try {
      await deleteUser(user.id);
      setUsers((prev) => prev.filter((item) => item.id !== user.id));
      pushToast({ message: "User deactivated.", severity: "success" });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to deactivate user."),
        severity: "error",
      });
    }
  };

  const getUserRoleNames = (user) =>
    (user.roles || []).map((role) => role.name).join(", ");

  return (
    <Box maxWidth="1280px">
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
          <Typography variant="h5">Users</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage staff accounts and roles
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
        >
          New User
        </Button>
      </Box>

      <Stack direction="row" spacing={1.5} mb={2.5}>
        <TextField
          size="small"
          placeholder="Search name, email, role..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          InputProps={{
            startAdornment: (
              <SearchIcon
                sx={{ mr: 0.5, color: "text.secondary", fontSize: 18 }}
              />
            ),
          }}
          sx={{ width: { xs: "100%", sm: 320 }, minWidth: 0 }}
        />
      </Stack>

      <TableContainer
        component={Card}
        sx={{ maxWidth: "100%", overflowX: "auto" }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Roles</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                </TableCell>
              </TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  align="center"
                  sx={{ py: 4, color: "text.secondary" }}
                >
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {(user.roles || []).length ? (
                      <Stack
                        direction="row"
                        spacing={0.5}
                        useFlexGap
                        flexWrap="wrap"
                      >
                        {(user.roles || []).map((role) => (
                          <Chip key={role.id} label={role.name} size="small" />
                        ))}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No roles
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <span>
                        <IconButton
                          size="small"
                          disabled={hasRole(user, "owner")}
                          onClick={() => openEdit(user)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={hasRole(user, "owner")}
                          onClick={() => handleDelete(user)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={openForm}
        onClose={() => setOpenForm(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{editingUser ? "Edit User" : "Create User"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} mt={0.5}>
            <TextField
              label="Name"
              size="small"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
            <TextField
              label="Email"
              type="email"
              size="small"
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
            />
            <FormControl size="small">
              <InputLabel>Roles</InputLabel>
              <Select
                multiple
                open={rolesSelectOpen}
                onOpen={() => setRolesSelectOpen(true)}
                onClose={() => setRolesSelectOpen(false)}
                value={form.roleIds}
                label="Roles"
                onChange={(event) => {
                  setForm((prev) => ({
                    ...prev,
                    roleIds: event.target.value.map((value) => Number(value)),
                  }));
                  setRolesSelectOpen(false);
                }}
                renderValue={(selected) =>
                  assignableRoles
                    .filter((role) =>
                      selected.map((value) => Number(value)).includes(role.id),
                    )
                    .map((role) => role.name)
                    .join(", ")
                }
              >
                {assignableRoles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    {role.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label={editingUser ? "New Password (optional)" : "Password"}
              type="password"
              size="small"
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
              helperText={
                editingUser
                  ? "Leave empty to keep current password"
                  : "Minimum 8 characters"
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={saving}>
            {editingUser ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
