import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import {
  CollapsibleFiltersPanel,
  CollapsibleFiltersToggle,
} from "../../components/common/CollapsibleFilters";
import AddIcon from "@mui/icons-material/Add";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import HrPageShell from "./components/HrPageShell";
import DepartmentBoard from "./components/DepartmentBoard";
import TerminalStatusBoard from "./components/TerminalStatusBoard";
import { TERMINAL_PROFILE_STATUSES } from "./components/staffProfileStatusHelpers";
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
  const [draftDepartmentFilter, setDraftDepartmentFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
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

  const departmentStaff = useMemo(
    () =>
      filtered.filter(
        (item) =>
          !TERMINAL_PROFILE_STATUSES.includes(item.staff_profile?.profile_status),
      ),
    [filtered],
  );

  const terminalStaff = useMemo(
    () =>
      filtered.filter((item) =>
        TERMINAL_PROFILE_STATUSES.includes(item.staff_profile?.profile_status),
      ),
    [filtered],
  );

  const handleCardClick = (staff) => {
    navigate(`${staff.id}`);
  };

  const hasSearch = Boolean(q.trim());
  const activeFilterCount = departmentFilter !== "all" ? 1 : 0;

  const applyFilters = () => {
    setDepartmentFilter(draftDepartmentFilter);
  };

  const clearFilters = () => {
    setDraftDepartmentFilter("all");
    setDepartmentFilter("all");
  };

  return (
    <HrPageShell
      title="HR Module"
      subtitle="Staff directory by department"
      actions={
        <Stack direction="row" spacing={1} flexWrap="wrap">
          <CollapsibleFiltersToggle
            open={filtersOpen}
            onToggle={setFiltersOpen}
            activeCount={activeFilterCount}
            size="small"
          />
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
          sx={{ width: { xs: "100%", sm: 360 } }}
        />
      </Stack>

      <CollapsibleFiltersPanel
        open={filtersOpen}
        onApply={applyFilters}
        onClear={clearFilters}
      >
        <TextField
          select
          size="small"
          label="Department"
          value={draftDepartmentFilter}
          onChange={(e) => setDraftDepartmentFilter(e.target.value)}
          sx={{ minWidth: 280 }}
        >
          <MenuItem value="all">All departments</MenuItem>
          {departments.map((department) => (
            <MenuItem key={department.id} value={String(department.id)}>
              {department.name}
            </MenuItem>
          ))}
          <MenuItem value="unassigned">Unassigned</MenuItem>
        </TextField>
      </CollapsibleFiltersPanel>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <LoadingIndicator size={112} />
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
        <>
          <DepartmentBoard
            departments={departments}
            staff={departmentStaff}
            onCardClick={handleCardClick}
            departmentFilter={departmentFilter}
            hideEmptySections={hasSearch}
          />
          <TerminalStatusBoard
            staff={terminalStaff}
            onCardClick={handleCardClick}
            hideEmptySections={hasSearch}
          />
        </>
      ) : null}

      <ManageDepartmentsDialog
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        onChanged={() => void loadBoard()}
      />
    </HrPageShell>
  );
}
