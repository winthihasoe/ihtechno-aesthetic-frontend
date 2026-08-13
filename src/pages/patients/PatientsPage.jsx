import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  alpha,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EventSeatIcon from "@mui/icons-material/EventSeat";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import dayjs from "dayjs";
import { getPatients } from "../../services/patientService";
import { createVisit } from "../../services/visitService";
import { resolveApiError } from "../../services/apiClient";
import useAuthStore from "../../stores/authStore";
import useToastStore from "../../stores/toastStore";
import CheckInConfirmDialog from "../../components/check-in/CheckInConfirmDialog";
import PostCheckInDestinationDialog from "../../components/check-in/PostCheckInDestinationDialog";
import {
  hasPermission,
  hidePatientContactDetails,
} from "../../utils/accessUtils";
import { canDo } from "../../utils/roleUtils";
import { getWorkspaceUrlPrefix } from "../../utils/workspaceRoutes";
import {
  formatPatientAgeSex,
  formatPatientDate,
  formatPatientDateTime,
  resolvePatientNumber,
} from "../../utils/patientUtils";

const emptyFilters = {
  status: "",
  gender: "",
  todayVisit: false,
  visitFrom: "",
  visitTo: "",
};

const SEARCH_DEBOUNCE_MS = 350;

function buildPatientQueryParams(filters, { searchQuery, page, rowsPerPage }) {
  const params = {
    include_deleted: true,
    page,
    per_page: rowsPerPage,
  };
  if (searchQuery) params.search = searchQuery;
  if (filters.status) params.status = filters.status;
  if (filters.gender) params.gender = filters.gender;
  if (filters.todayVisit) {
    params.last_visit = dayjs().format("YYYY-MM-DD");
  } else {
    if (filters.visitFrom) params.last_visit_from = filters.visitFrom;
    if (filters.visitTo) params.last_visit_to = filters.visitTo;
  }
  return params;
}

function normalizePatientsPayload(data) {
  if (Array.isArray(data)) {
    return { rows: data, total: data.length, stats: null };
  }
  const rows = Array.isArray(data?.data) ? data.data : [];
  return {
    rows,
    total: typeof data?.total === "number" ? data.total : rows.length,
    stats: data?.stats ?? null,
  };
}

export default function PatientsPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { pushToast } = useToastStore();
  const prefix = getWorkspaceUrlPrefix(user);
  const hideContactUi = hidePatientContactDetails(user);
  const canManagePatients = hasPermission(user, "patients.manage");
  const canCreateVisit = canDo(user?.role, "create_visit");

  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const [checkInPatient, setCheckInPatient] = useState(null);
  const [postCheckInOpen, setPostCheckInOpen] = useState(false);
  const rowsPerPage = 30;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPatients(
        buildPatientQueryParams(appliedFilters, {
          searchQuery,
          page,
          rowsPerPage,
        }),
      );
      const { rows, total, stats: nextStats } = normalizePatientsPayload(data);
      setPatients(rows);
      setTotalPatients(total);
      setStats(nextStats);
    } catch (err) {
      setError(resolveApiError(err, "Could not load patient registry."));
      setPatients([]);
      setTotalPatients(0);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, appliedFilters]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    if (stats) {
      return {
        total: stats.total ?? totalPatients,
        active: stats.active ?? 0,
        inactive: stats.inactive ?? 0,
        inClinicToday: stats.in_clinic_today ?? 0,
      };
    }
    return {
      total: totalPatients,
      active: patients.filter((p) => p.status === "active").length,
      inactive: patients.filter((p) => p.status === "inactive").length,
      inClinicToday: patients.filter((p) => p.in_clinic_today).length,
    };
  }, [stats, totalPatients, patients]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (appliedFilters.status) {
      chips.push({
        key: "status",
        label: `Status: ${appliedFilters.status}`,
        onDelete: () => setAppliedFilters((prev) => ({ ...prev, status: "" })),
      });
    }
    if (appliedFilters.gender) {
      chips.push({
        key: "gender",
        label: `Gender: ${appliedFilters.gender}`,
        onDelete: () => setAppliedFilters((prev) => ({ ...prev, gender: "" })),
      });
    }
    if (appliedFilters.todayVisit) {
      chips.push({
        key: "today",
        label: "Last visit: Today",
        onDelete: () =>
          setAppliedFilters((prev) => ({ ...prev, todayVisit: false })),
      });
    } else {
      if (appliedFilters.visitFrom) {
        chips.push({
          key: "from",
          label: `Visit from ${formatPatientDate(appliedFilters.visitFrom)}`,
          onDelete: () =>
            setAppliedFilters((prev) => ({ ...prev, visitFrom: "" })),
        });
      }
      if (appliedFilters.visitTo) {
        chips.push({
          key: "to",
          label: `Visit to ${formatPatientDate(appliedFilters.visitTo)}`,
          onDelete: () =>
            setAppliedFilters((prev) => ({ ...prev, visitTo: "" })),
        });
      }
    }
    return chips;
  }, [appliedFilters]);

  const visitRangeDisabled = draftFilters.todayVisit;
  const hasActiveFilters = Boolean(searchQuery) || activeFilterChips.length > 0;

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({ ...draftFilters });
  };

  const resetFilters = () => {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  };

  const openPatientChart = (patientId) => {
    navigate(`${prefix}/patients/${patientId}`);
  };

  const handleCheckInSubmit = async ({
    newComplaint,
    followUp,
    checkInMode,
    note,
  }) => {
    if (!checkInPatient) return;
    try {
      await createVisit({
        patient_id: checkInPatient.id,
        new_complaint: newComplaint,
        follow_up: followUp,
        check_in_mode: checkInMode,
        notes: note,
      });
      setCheckInPatient(null);
      setPostCheckInOpen(true);
      await load();
      pushToast({
        message: `${checkInPatient.name} checked in — added to today's visit register.`,
        severity: "success",
      });
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Check-in failed."),
        severity: "error",
      });
      throw err;
    }
  };

  const isDark = theme.palette.mode === "dark";
  const headerSurfaceSx = {
    borderRadius: 1,
    border: `1px solid ${alpha(theme.palette.primary.main, isDark ? 0.28 : 0.14)}`,
    background: [
      isDark
        ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.96)} 0%, ${alpha(theme.palette.background.default, 0.9)} 100%)`
        : `linear-gradient(135deg, ${alpha("#ffffff", 0.94)} 0%, ${alpha(theme.palette.background.default, 0.88)} 20%)`,
      `radial-gradient(ellipse 80% 60% at 100% 0%, ${alpha(theme.palette.primary.main, isDark ? 0.14 : 0.07)}, transparent 55%)`,
    ].join(", "),
    boxShadow: isDark
      ? `0 10px 28px ${alpha(theme.palette.common.black, 0.35)}`
      : `0 10px 28px ${alpha(theme.palette.text.primary, 0.06)}`,
  };

  const colSpan = hideContactUi ? 7 : 8;

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        gap={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Patient Registry
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Master patient index — search by number, name, or phone and open
            clinical records.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            label={`${summary.total} registered`}
            size="small"
            icon={<PeopleOutlinedIcon sx={{ fontSize: "16px !important" }} />}
          />
          <Chip
            label={`${summary.active} active`}
            size="small"
            sx={{
              bgcolor: alpha(theme.palette.success.main, 0.12),
              color: theme.palette.success.dark,
              fontWeight: 600,
            }}
          />
          <Chip
            label={`${summary.inClinicToday} in clinic today`}
            size="small"
            sx={{
              bgcolor: alpha(theme.palette.info.main, 0.12),
              color: theme.palette.info.dark,
              fontWeight: 600,
            }}
          />
          {summary.inactive > 0 && (
            <Chip
              label={`${summary.inactive} inactive`}
              size="small"
              variant="outlined"
            />
          )}
        </Stack>
      </Stack>

      <Paper
        elevation={0}
        sx={{ ...headerSurfaceSx, p: { xs: 2, sm: 2.5 }, mb: 2.5 }}
      >
        <Stack spacing={2}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", lg: "center" }}
            justifyContent="space-between"
          >
            <TextField
              size="small"
              placeholder={
                hideContactUi
                  ? "Search patient no., name, notes…"
                  : "Search patient no., name, phone…"
              }
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: { xs: "100%", lg: 320 }, flex: 1 }}
            />

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <TextField
                select
                label="Status"
                size="small"
                value={draftFilters.status}
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    status: e.target.value,
                  }))
                }
                sx={{ minWidth: 130 }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>

              <TextField
                select
                label="Gender"
                size="small"
                value={draftFilters.gender}
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    gender: e.target.value,
                  }))
                }
                sx={{ minWidth: 120 }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
              </TextField>

              <Button
                variant="contained"
                size="small"
                startIcon={<FilterListOutlinedIcon />}
                onClick={applyFilters}
                sx={{ height: 40 }}
              >
                Apply
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshOutlinedIcon />}
                onClick={resetFilters}
                sx={{ height: 40 }}
              >
                Reset
              </Button>
              {canManagePatients && (
                <Button
                  variant="contained"
                  color="secondary"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => navigate(`${prefix}/patients/new`)}
                  sx={{ height: 40 }}
                >
                  Register
                </Button>
              )}
            </Stack>
          </Stack>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", md: "center" }}
            flexWrap="wrap"
            useFlexGap
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={draftFilters.todayVisit}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setDraftFilters((prev) => ({
                      ...prev,
                      todayVisit: checked,
                      ...(checked ? { visitFrom: "", visitTo: "" } : {}),
                    }));
                  }}
                />
              }
              label="Last visit today"
              sx={{ m: 0 }}
            />
            <TextField
              label="Visit from"
              type="date"
              size="small"
              disabled={visitRangeDisabled}
              InputLabelProps={{ shrink: true }}
              value={draftFilters.visitFrom}
              onChange={(e) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  todayVisit: false,
                  visitFrom: e.target.value,
                }))
              }
              sx={{ minWidth: 160 }}
            />
            <TextField
              label="Visit to"
              type="date"
              size="small"
              disabled={visitRangeDisabled}
              InputLabelProps={{ shrink: true }}
              value={draftFilters.visitTo}
              onChange={(e) =>
                setDraftFilters((prev) => ({
                  ...prev,
                  todayVisit: false,
                  visitTo: e.target.value,
                }))
              }
              sx={{ minWidth: 160 }}
            />
          </Stack>

          {activeFilterChips.length > 0 && (
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              alignItems="center"
            >
              <Typography variant="caption" color="text.secondary">
                Active filters:
              </Typography>
              {activeFilterChips.map((chip) => (
                <Chip
                  key={chip.key}
                  size="small"
                  label={chip.label}
                  onDelete={chip.onDelete}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </Paper>

      <Card
        elevation={0}
        sx={{
          overflow: "hidden",
        }}
      >
        <TableContainer>
          <Table size="medium" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Patient No.</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Age / Sex</TableCell>
                {!hideContactUi && <TableCell>Phone</TableCell>}
                <TableCell>Registered</TableCell>
                <TableCell>Last Visit</TableCell>
                <TableCell>Status</TableCell>
                <TableCell
                  align="left"
                  sx={{ width: 88, whiteSpace: "nowrap" }}
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={colSpan} align="center" sx={{ py: 8 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={colSpan} sx={{ py: 6 }}>
                    <Typography color="error" align="center">
                      {error}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : patients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} sx={{ py: 8 }}>
                    <Stack alignItems="center" spacing={1.5}>
                      <PeopleOutlinedIcon
                        color="disabled"
                        sx={{ fontSize: 40 }}
                      />
                      <Typography color="text.secondary" align="center">
                        {hasActiveFilters
                          ? "No patients match your search or filters."
                          : "No patients registered yet."}
                      </Typography>
                      {canManagePatients && !hasActiveFilters && (
                        <Button
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => navigate(`${prefix}/patients/new`)}
                        >
                          Register first patient
                        </Button>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                patients.map((patient) => {
                  const isSoftDeleted = Boolean(patient.deleted_at);
                  const patientNo = resolvePatientNumber(patient);

                  return (
                    <TableRow
                      key={patient.id}
                      hover
                      sx={{
                        opacity: isSoftDeleted ? 0.45 : 1,
                        cursor: "pointer",
                      }}
                      onClick={() => openPatientChart(patient.id)}
                    >
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: "ui-monospace, monospace",
                            fontWeight: 700,
                            letterSpacing: 0.4,
                            color: "primary.main",
                          }}
                        >
                          {patientNo}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          flexWrap="wrap"
                        >
                          <Typography sx={{ fontWeight: 600 }}>
                            {patient.name}
                          </Typography>
                          {patient.in_clinic_today && (
                            <Chip
                              label="In clinic"
                              size="small"
                              color="info"
                              variant="outlined"
                            />
                          )}
                          {isSoftDeleted && (
                            <Chip
                              label="Deleted"
                              size="small"
                              color="default"
                            />
                          )}
                        </Stack>
                        {patient.notes && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: "block",
                              mt: 0.25,
                              maxWidth: 280,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {patient.notes}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>
                        {formatPatientAgeSex(patient)}
                      </TableCell>
                      {!hideContactUi && (
                        <TableCell>{patient.phone || "—"}</TableCell>
                      )}
                      <TableCell sx={{ color: "text.secondary" }}>
                        {formatPatientDateTime(patient.created_at)}
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>
                        {patient.last_visit_at
                          ? formatPatientDateTime(patient.last_visit_at)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={patient.status}
                          size="small"
                          color={
                            patient.status === "active" ? "success" : "default"
                          }
                          sx={{ textTransform: "capitalize" }}
                        />
                      </TableCell>
                      <TableCell
                        align="left"
                        sx={{ width: 88, whiteSpace: "nowrap" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Stack
                          direction="row"
                          spacing={0.25}
                          justifyContent="flex-start"
                          alignItems="center"
                        >
                          <Tooltip title="Open patient chart">
                            <IconButton
                              size="small"
                              onClick={() => openPatientChart(patient.id)}
                            >
                              <VisibilityOutlinedIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {canCreateVisit && patient.status === "active" && (
                            <Tooltip title="Check in for visit">
                              <IconButton
                                size="small"
                                color="secondary"
                                onClick={() => setCheckInPatient(patient)}
                              >
                                <EventSeatIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          rowsPerPageOptions={[rowsPerPage]}
          count={totalPatients}
          rowsPerPage={rowsPerPage}
          page={Math.max(0, page - 1)}
          onPageChange={(_, nextZeroBased) => {
            setPage(nextZeroBased + 1);
          }}
          onRowsPerPageChange={() => {}}
          labelRowsPerPage="Rows"
        />
      </Card>

      <CheckInConfirmDialog
        open={Boolean(checkInPatient)}
        onClose={() => setCheckInPatient(null)}
        patientName={checkInPatient?.name ?? ""}
        onCheckIn={handleCheckInSubmit}
      />

      <PostCheckInDestinationDialog
        open={postCheckInOpen}
        onClose={() => setPostCheckInOpen(false)}
        onGoToLiveBoard={() => {
          setPostCheckInOpen(false);
          navigate(`${prefix}/visit-history`);
        }}
      />
    </Box>
  );
}
