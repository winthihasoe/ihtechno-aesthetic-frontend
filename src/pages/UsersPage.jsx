import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  alpha,
  Alert,
  Avatar,
  Box,
  Typography,
  Stack,
  TextField,
  Paper,
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
  InputAdornment,
  Link,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import dayjs from "dayjs";
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
import useAuthStore from "../stores/authStore";
import { hasRole } from "../utils/accessUtils";
import { getWorkspaceUrlPrefix } from "../utils/workspaceRoutes";

const EMPTY_FORM = {
  name: "",
  email: "",
  roleIds: [],
  password: "",
};

const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const ROLE_CHIP_COLORS = {
  ceo: "error",
  owner: "error",
  admin: "warning",
  medical_officer: "primary",
  dermatologist: "secondary",
  senior_nurse: "info",
};

const isDeveloperAccount = (user) =>
  user?.role === "developer" ||
  (user?.roles || []).some((role) => role?.slug === "developer");

const isProtectedAccount = (user) =>
  hasRole(user, "owner") || isDeveloperAccount(user);

const getInitials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const formatDateTime = (value) =>
  value && dayjs(value).isValid()
    ? dayjs(value).format("DD-MM-YYYY hh:mm")
    : "—";

export default function UsersPage() {
  const theme = useTheme();
  const { askConfirm } = useConfirmStore();
  const { pushToast } = useToastStore();
  const { user: currentUser } = useAuthStore();
  const workspacePrefix = getWorkspaceUrlPrefix(currentUser);

  const [users, setUsers] = useState([]);
  const [assignableRoles, setAssignableRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [rolesSelectOpen, setRolesSelectOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const loadUsers = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const [usersData, rolesData] = await Promise.all([
          getUsers(),
          getAssignableRoles(),
        ]);
        setUsers(Array.isArray(usersData) ? [...usersData] : []);
        setAssignableRoles(Array.isArray(rolesData) ? rolesData : []);
      } catch (error) {
        pushToast({
          message: resolveApiError(error, "Failed to load users."),
          severity: "error",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [pushToast],
  );

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const visibleUsers = useMemo(
    () => users.filter((user) => !isDeveloperAccount(user)),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return visibleUsers
      .filter((user) => {
        const matchesSearch =
          !query ||
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query) ||
          (user.roles || []).some((role) =>
            role.name.toLowerCase().includes(query),
          );

        const matchesRole =
          !roleFilter ||
          (user.roles || []).some((role) => String(role.id) === roleFilter);

        const isActive = user.is_active !== false;
        const matchesStatus =
          !statusFilter ||
          (statusFilter === "active" ? isActive : !isActive);

        return matchesSearch && matchesRole && matchesStatus;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [visibleUsers, search, roleFilter, statusFilter]);

  const stats = useMemo(
    () => ({
      total: visibleUsers.length,
      active: visibleUsers.filter((user) => user.is_active !== false).length,
      roles: assignableRoles.length,
    }),
    [visibleUsers, assignableRoles],
  );

  const formValid = useMemo(() => {
    if (!form.name.trim() || !form.email.trim() || !isValidEmail(form.email)) {
      return false;
    }
    if (form.roleIds.length === 0) return false;
    if (!editingUser && form.password.length < 8) return false;
    return true;
  }, [form, editingUser]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setShowPassword(false);
    setOpenForm(true);
  };

  const openEdit = (user) => {
    if (isProtectedAccount(user)) return;
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      roleIds: (user.roles || []).map((role) => role.id),
      password: "",
    });
    setShowPassword(false);
    setOpenForm(true);
  };

  const closeForm = () => {
    setOpenForm(false);
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setShowPassword(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      pushToast({ message: "Name and email are required.", severity: "error" });
      return;
    }

    if (!isValidEmail(form.email)) {
      pushToast({ message: "Enter a valid email address.", severity: "error" });
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
          name: form.name.trim(),
          email: form.email.trim(),
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
          name: form.name.trim(),
          email: form.email.trim(),
          role_ids: form.roleIds,
          password: form.password,
        });
        setUsers((prev) => {
          const withoutDuplicate = prev.filter((user) => user.id !== created.id);
          return [...withoutDuplicate, created].sort((a, b) =>
            a.name.localeCompare(b.name),
          );
        });
        pushToast({
          message: "User created successfully.",
          severity: "success",
        });
      }

      closeForm();
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
    if (isProtectedAccount(user)) return;

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

  const hasActiveFilters = Boolean(search.trim() || roleFilter || statusFilter);

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("");
    setStatusFilter("");
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        gap={2}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Users
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage staff login accounts, assign roles, and control access.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            label={`${stats.total} users`}
            icon={<PeopleOutlinedIcon sx={{ fontSize: "16px !important" }} />}
          />
          <Chip
            size="small"
            label={`${stats.active} active`}
            sx={{
              bgcolor: alpha(theme.palette.success.main, 0.12),
              color: theme.palette.success.dark,
              fontWeight: 600,
            }}
          />
          <Chip
            size="small"
            variant="outlined"
            label={`${stats.roles} roles`}
            icon={<ShieldOutlinedIcon sx={{ fontSize: "16px !important" }} />}
            component={RouterLink}
            to={`${workspacePrefix}/roles-permissions`}
            clickable
          />
          <Tooltip title="Refresh">
            <span>
              <IconButton
                size="small"
                onClick={() => loadUsers({ silent: true })}
                disabled={loading || refreshing}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New User
          </Button>
        </Stack>
      </Stack>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 2,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
          <TextField
            size="small"
            placeholder="Search name, email, or role…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: "100%", sm: 320 } }}
          />
          <TextField
            select
            size="small"
            label="Role"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All roles</MenuItem>
            {assignableRoles.map((role) => (
              <MenuItem key={role.id} value={String(role.id)}>
                {role.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            sx={{ minWidth: 160 }}
          >
            {STATUS_FILTERS.map((option) => (
              <MenuItem key={option.value || "all"} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          {hasActiveFilters && (
            <Button size="small" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </Stack>
      </Paper>

      {!loading && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          Showing {filteredUsers.length} of {visibleUsers.length} users
        </Typography>
      )}

      <Paper elevation={0} sx={{ overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table size="medium" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Roles</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Last updated</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 96 }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ py: 6 }}>
                      <Stack alignItems="center" spacing={1}>
                        <PeopleOutlinedIcon color="disabled" sx={{ fontSize: 40 }} />
                        <Typography variant="body2" color="text.secondary">
                          {hasActiveFilters
                            ? "No users match your filters."
                            : "No users found."}
                        </Typography>
                        {hasActiveFilters && (
                          <Button size="small" onClick={clearFilters}>
                            Clear filters
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const protectedAccount = isProtectedAccount(user);
                    const isActive = user.is_active !== false;

                    return (
                      <TableRow
                        key={user.id}
                        hover
                        sx={{
                          cursor: protectedAccount ? "default" : "pointer",
                          opacity: isActive ? 1 : 0.72,
                        }}
                        onClick={() => !protectedAccount && openEdit(user)}
                      >
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar
                              sx={{
                                width: 36,
                                height: 36,
                                fontSize: 14,
                                bgcolor: alpha(theme.palette.primary.main, 0.14),
                                color: theme.palette.primary.dark,
                              }}
                            >
                              {user.avatar || getInitials(user.name)}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {user.name}
                              </Typography>
                              {protectedAccount && (
                                <Typography variant="caption" color="text.secondary">
                                  Protected account
                                </Typography>
                              )}
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{user.email}</Typography>
                        </TableCell>
                        <TableCell>
                          {(user.roles || []).length ? (
                            <Stack
                              direction="row"
                              spacing={0.5}
                              useFlexGap
                              flexWrap="wrap"
                            >
                              {(user.roles || []).map((role) => (
                                <Chip
                                  key={role.id}
                                  label={role.name}
                                  size="small"
                                  color={ROLE_CHIP_COLORS[role.slug] || "default"}
                                  variant={
                                    ROLE_CHIP_COLORS[role.slug] ? "filled" : "outlined"
                                  }
                                />
                              ))}
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No roles
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={isActive ? "Active" : "Inactive"}
                            color={isActive ? "success" : "default"}
                            variant={isActive ? "filled" : "outlined"}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatDateTime(user.updated_at || user.created_at)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                          <Tooltip
                            title={
                              protectedAccount
                                ? "Protected accounts cannot be modified"
                                : "Edit user"
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                disabled={protectedAccount}
                                onClick={() => openEdit(user)}
                              >
                                <EditOutlinedIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip
                            title={
                              protectedAccount
                                ? "Protected accounts cannot be deactivated"
                                : "Deactivate user"
                            }
                          >
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={protectedAccount}
                                onClick={() => handleDelete(user)}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog open={openForm} onClose={closeForm} fullWidth maxWidth="sm">
        <DialogTitle>{editingUser ? "Edit User" : "Create User"}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} mt={0.5}>
            {!editingUser && (
              <Alert severity="info" sx={{ py: 0.5 }}>
                New users receive login credentials immediately. Share the password
                securely.
              </Alert>
            )}
            <TextField
              label="Name"
              size="small"
              required
              autoFocus
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
            <TextField
              label="Email"
              type="email"
              size="small"
              required
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
              error={Boolean(form.email.trim()) && !isValidEmail(form.email)}
              helperText={
                form.email.trim() && !isValidEmail(form.email)
                  ? "Enter a valid email address"
                  : " "
              }
            />
            <FormControl size="small" required>
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
              type={showPassword ? "text" : "password"}
              size="small"
              required={!editingUser}
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
              helperText={
                editingUser
                  ? "Leave empty to keep current password"
                  : "Minimum 8 characters"
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      edge="end"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? (
                        <VisibilityOffIcon fontSize="small" />
                      ) : (
                        <VisibilityIcon fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Typography variant="caption" color="text.secondary">
              Manage role permissions on the{" "}
              <Link
                component={RouterLink}
                to={`${workspacePrefix}/roles-permissions`}
                underline="hover"
              >
                Roles & Permissions
              </Link>{" "}
              page.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeForm} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={saving || !formValid}
          >
            {saving ? "Saving…" : editingUser ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
