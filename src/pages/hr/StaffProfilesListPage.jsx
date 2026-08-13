import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import HrPageShell from "./components/HrPageShell";
import DepartmentBoard from "./components/DepartmentBoard";
import ManageDepartmentsDialog from "./components/ManageDepartmentsDialog";
import { getDepartments, getStaffs } from "../../services/hrService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import useAuthStore from "../../stores/authStore";
import { hasPermission } from "../../utils/accessUtils";

const isDeveloperAccount = (user) =>
  user?.role === "developer" ||
  (user?.roles || []).some((role) => role?.slug === "developer");

export default function StaffProfilesListPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { pushToast } = useToastStore();
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [q, setQ] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [manageOpen, setManageOpen] = useState(false);
  const canManageDepartments = hasPermission(user, "hr.manage");

  const loadBoard = useCallback(async () => {
    setLoading(true);
    try {
      const [staffPayload, departmentPayload] = await Promise.all([
        getStaffs(),
        getDepartments(),
      ]);
      setRows(staffPayload);
      setDepartments(departmentPayload);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to load staff profiles."),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const filtered = useMemo(() => {
    const visibleRows = rows.filter((item) => !isDeveloperAccount(item));
    const query = q.trim().toLowerCase();
    if (!query) return visibleRows;
    return visibleRows.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.email.toLowerCase().includes(query) ||
        (item.staff_profile?.position_title || "")
          .toLowerCase()
          .includes(query) ||
        (item.staff_profile?.department?.name || "")
          .toLowerCase()
          .includes(query),
    );
  }, [rows, q]);

  const handleCardClick = (staff) => {
    navigate(`${staff.id}`);
  };

  const hasSearch = Boolean(q.trim());

  return (
    <HrPageShell
      title="HR Module"
      subtitle="Staff directory by department"
      guide={[
        "The staff directory grouped by department — search by name, email, position or department.",
        "Open a profile to view employment details and documents, or use Create Profile to onboard a new hire.",
        "Departments can be reorganised from Manage Departments.",
      ]}
      actions={
        <Stack direction={"row"} spacing={1}>
          {canManageDepartments ? (
            <Button
              variant="outlined"
              startIcon={<SettingsOutlinedIcon />}
              onClick={() => setManageOpen(true)}
            >
              Manage Departments
            </Button>
          ) : null}
          <Button
            component={Link}
            to="create"
            variant="contained"
            startIcon={<AddIcon />}
          >
            Create Profile
          </Button>
        </Stack>
      }
    >
      <Stack
        direction={"row"}
        spacing={1.5}
        mb={2.5}
        alignItems={{ xs: "stretch", md: "center" }}
      >
        <TextField
          size="small"
          placeholder="Search by name, email, position, or department"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ width: { xs: "50%", md: 360 } }}
        />
        <TextField
          select
          size="small"
          label="Department"
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          sx={{ width: { xs: "50%", md: 280 } }}
        >
          <MenuItem value="all">All departments</MenuItem>
          {departments.map((department) => (
            <MenuItem key={department.id} value={String(department.id)}>
              {department.name}
            </MenuItem>
          ))}
          <MenuItem value="unassigned">Unassigned</MenuItem>
        </TextField>
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : null}

      {!loading && !filtered.length ? (
        <Card variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="body2" color="text.secondary">
            No staff profiles found for this search or filter.
          </Typography>
        </Card>
      ) : null}

      {!loading && filtered.length ? (
        <DepartmentBoard
          departments={departments}
          staff={filtered}
          onCardClick={handleCardClick}
          departmentFilter={departmentFilter}
          hideEmptySections={hasSearch}
        />
      ) : null}

      <ManageDepartmentsDialog
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        onChanged={() => void loadBoard()}
      />
    </HrPageShell>
  );
}
