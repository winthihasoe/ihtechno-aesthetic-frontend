import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  Alert,
  Card,
  TablePagination,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import GuidedEmptyState from "../../components/common/GuidedEmptyState";
import {
  CollapsibleFiltersPanel,
  CollapsibleFiltersToggle,
} from "../../components/common/CollapsibleFilters";
import AddIcon from "@mui/icons-material/Add";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CloseIcon from "@mui/icons-material/Close";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import SearchIcon from "@mui/icons-material/Search";
import dayjs from "dayjs";
import { getPatients } from "../../services/patientService";
import { resolveApiError } from "../../services/apiClient";
import useAuthStore from "../../stores/authStore";
import {
  hasPermission,
  hidePatientContactDetails,
} from "../../utils/accessUtils";
import { getUserLiveBoardPath } from "../../utils/workspaceRoutes";
import PatientImportDialog from "./components/PatientImportDialog";

const emptyFilters = {
  status: "",
  todayVisit: false,
  visitFrom: "",
  visitTo: "",
};

const EMPTY_STEPS = [
  {
    icon: PersonAddOutlinedIcon,
    title: "Register a patient",
    body: "Capture name, contact details, referral source, and notes — one record for every visit and treatment.",
  },
  {
    icon: UploadFileIcon,
    title: "Import in bulk",
    body: "Use Import Patients to load a spreadsheet when migrating legacy records or onboarding many contacts at once.",
  },
  {
    icon: HowToRegOutlinedIcon,
    title: "Check in on the day",
    body: "Create a visit from the Live Board or an appointment so clinical staff can document care on the patient chart.",
  },
];

function formatFilterDate(iso) {
  if (!iso) return "";
  return dayjs(iso).format("DD-MM-YYYY");
}

function buildPatientQueryParams(filters, { searchQuery, page, rowsPerPage }) {
  const params = {
    include_deleted: true,
    page,
    per_page: rowsPerPage,
  };
  if (searchQuery) params.search = searchQuery;
  if (filters.status) params.status = filters.status;
  if (filters.todayVisit) {
    params.last_visit = dayjs().format("YYYY-MM-DD");
  } else {
    if (filters.visitFrom) params.last_visit_from = filters.visitFrom;
    if (filters.visitTo) params.last_visit_to = filters.visitTo;
  }
  return params;
}

export default function PatientsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const hideContactUi = hidePatientContactDetails(user);
  const canManagePatients = hasPermission(user, "patients.manage");
  const liveBoardPath = getUserLiveBoardPath(user);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [totalPatients, setTotalPatients] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const rowsPerPage = 30;

  const setDraft = (key, value) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applySearch = () => {
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput("");
    setPage(1);
    setSearchQuery("");
  };

  const applyFilters = () => {
    setPage(1);
    setAppliedFilters({ ...draftFilters });
  };

  const cancelFilters = () => {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
  };

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
      const rows = Array.isArray(data) ? data : (data?.data ?? []);
      setPatients(rows);
      setTotalPatients(
        typeof data?.total === "number" ? data.total : rows.length,
      );
    } catch (err) {
      setError(resolveApiError(err, "Could not load patients."));
      setPatients([]);
      setTotalPatients(0);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, appliedFilters]);

  useEffect(() => {
    load();
  }, [load]);

  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (appliedFilters.status) {
      chips.push({
        key: "status",
        label: `Status: ${appliedFilters.status}`,
      });
    }
    if (appliedFilters.todayVisit) {
      chips.push({ key: "today", label: "Visit: Today" });
    } else {
      if (appliedFilters.visitFrom) {
        chips.push({
          key: "from",
          label: `Visit from ${formatFilterDate(appliedFilters.visitFrom)}`,
        });
      }
      if (appliedFilters.visitTo) {
        chips.push({
          key: "to",
          label: `Visit to ${formatFilterDate(appliedFilters.visitTo)}`,
        });
      }
    }
    return chips;
  }, [appliedFilters]);

  const visitRangeDisabled = draftFilters.todayVisit;

  const hasActiveFilters = activeFilterChips.length > 0;
  const hasSearchQuery = Boolean(searchQuery.trim());
  const showGuidedEmpty =
    !loading && !error && patients.length === 0 && !hasActiveFilters && !hasSearchQuery;
  const showFilteredEmpty =
    !loading && !error && patients.length === 0 && (hasActiveFilters || hasSearchQuery);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "space-between",
          gap: 1.5,
          flexWrap: "wrap",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Patients
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, maxWidth: 640, lineHeight: 1.65 }}
          >
            Search and manage patient records, contact details, and visit history.
          </Typography>
        </Box>
        {canManagePatients && !showGuidedEmpty ? (
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<UploadFileIcon />}
              onClick={() => setImportOpen(true)}
            >
              Import Patients
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => navigate("/patients/new")}
            >
              New Patient
            </Button>
          </Stack>
        ) : null}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack
        direction="row"
        spacing={1.5}
        mb={2}
        useFlexGap
        alignItems="flex-start"
      >
        <TextField
          size="small"
          placeholder={
            hideContactUi
              ? "Search name, referral, notes, address…"
              : "Search name, phone, Viber, Telegram, referral, address, notes…"
          }
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applySearch();
            }
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              </InputAdornment>
            ),
            endAdornment:
              searchInput || searchQuery ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    aria-label="Clear search"
                    onClick={clearSearch}
                    edge="end"
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
          }}
          sx={{ width: { xs: "100%", sm: 280 } }}
        />
        <Button
          variant="outlined"
          size="small"
          onClick={applySearch}
          sx={{ height: 40, flexShrink: 0 }}
        >
          Search
        </Button>
        <CollapsibleFiltersToggle
          open={filtersOpen}
          onToggle={setFiltersOpen}
          activeCount={activeFilterChips.length}
          size="small"
          sx={{ height: 40, flexShrink: 0 }}
        />
      </Stack>

      <CollapsibleFiltersPanel
        open={filtersOpen}
        onApply={applyFilters}
        onClear={cancelFilters}
        clearLabel="Clear filters"
      >
        <Stack
          direction={{ xs: "column", lg: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", lg: "flex-end" }}
          useFlexGap
          flexWrap="wrap"
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
            label="Today's visit"
            sx={{
              m: 0,
              minWidth: { xs: "100%", sm: 160 },
              alignSelf: { lg: "center" },
            }}
          />

          <TextField
            label="Visit from"
            type="date"
            size="small"
            disabled={visitRangeDisabled}
            InputLabelProps={{ shrink: true }}
            value={draftFilters.visitFrom}
            onChange={(e) => {
              const value = e.target.value;
              setDraftFilters((prev) => ({
                ...prev,
                todayVisit: false,
                visitFrom: value,
              }));
            }}
            sx={{
              minWidth: { xs: "100%", sm: 180 },
              width: { xs: "100%", lg: "auto" },
            }}
          />

          <TextField
            label="Visit to"
            type="date"
            size="small"
            disabled={visitRangeDisabled}
            InputLabelProps={{ shrink: true }}
            value={draftFilters.visitTo}
            onChange={(e) => {
              const value = e.target.value;
              setDraftFilters((prev) => ({
                ...prev,
                todayVisit: false,
                visitTo: value,
              }));
            }}
            sx={{
              minWidth: { xs: "100%", sm: 180 },
              width: { xs: "100%", lg: "auto" },
            }}
          />

          <TextField
            select
            label="Status"
            size="small"
            value={draftFilters.status}
            onChange={(e) => setDraft("status", e.target.value)}
            sx={{
              minWidth: { xs: "100%", sm: 160 },
              width: { xs: "100%", lg: "auto" },
            }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        </Stack>
      </CollapsibleFiltersPanel>

      {activeFilterChips.length > 0 && (
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          sx={{ mb: 2 }}
          alignItems="center"
        >
          <Typography variant="caption" color="text.secondary">
            Active:
          </Typography>
          {activeFilterChips.map((chip) => (
            <Chip key={chip.key} size="small" label={chip.label} />
          ))}
        </Stack>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : showGuidedEmpty ? (
        <GuidedEmptyState
          icon={PeopleOutlinedIcon}
          title="No patients yet"
          description="Every visit, treatment, and invoice links to a patient record here. Add your first patient manually or import a spreadsheet to start building the clinic directory."
          primaryAction={
            canManagePatients
              ? {
                  label: "New patient",
                  onClick: () => navigate("/patients/new"),
                  startIcon: <AddIcon />,
                }
              : null
          }
          steps={EMPTY_STEPS}
          footer={
            <>
              Walk-ins and appointments are checked in from the{" "}
              <Typography
                component={RouterLink}
                to={liveBoardPath}
                variant="body2"
                sx={{
                  color: "primary.main",
                  fontWeight: 600,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Live Board
              </Typography>
              .
            </>
          }
        />
      ) : (
      <TableContainer
        component={Card}
        sx={{ maxWidth: "100%", overflowX: "auto" }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              {!hideContactUi && <TableCell>Phone</TableCell>}
              {!hideContactUi && <TableCell>Viber Phone</TableCell>}
              {!hideContactUi && <TableCell>Telegram No.</TableCell>}
              <TableCell>Referral</TableCell>
              <TableCell>Data Collector</TableCell>

              <TableCell>Last Visit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {showFilteredEmpty ? (
              <TableRow>
                <TableCell
                  colSpan={hideContactUi ? 5 : 8}
                  align="center"
                  sx={{ py: 4, color: "text.secondary" }}
                >
                  No patients match your search or filters.
                </TableCell>
              </TableRow>
            ) : (
              patients.map((p) => {
                const isSoftDeleted = Boolean(p.deleted_at);

                return (
                  <TableRow
                    key={p.id}
                    hover
                    sx={{
                      opacity: isSoftDeleted ? 0.45 : 1,
                      transition: "opacity 0.2s ease",
                      cursor: "pointer",
                    }}
                    onClick={() => navigate(`/patients/${p.id}`)}
                  >
                    <TableCell>
                      <Typography
                        variant="overline"
                        fontFamily={"Times New Roman"}
                        fontWeight={800}
                        color="text.secondary"
                      >
                        {p.id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span
                          style={{
                            fontWeight: 500,
                            fontFamily: "Times New Roman",
                            fontSize: "1rem",
                          }}
                        >
                          {p.name}
                        </span>
                        {isSoftDeleted && (
                          <Chip label="Deleted" size="small" color="default" />
                        )}
                      </Stack>
                    </TableCell>
                    {!hideContactUi && (
                      <TableCell>
                        <Typography fontSize={"0.8rem"}>{p.phone}</Typography>
                      </TableCell>
                    )}
                    {!hideContactUi && (
                      <TableCell>
                        <Typography fontSize={"0.8rem"}>
                          {p.viber_phone || "-"}
                        </Typography>
                      </TableCell>
                    )}
                    {!hideContactUi && (
                      <TableCell>
                        <Typography fontSize={"0.8rem"}>
                          {p.telegram_phone || "-"}
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell sx={{ color: "text.secondary" }}>
                      <Typography fontSize={"0.8rem"}>
                        {p.referral_name || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>
                      <Typography fontSize={"0.8rem"}>
                        {p.data_collector?.name || "-"}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ color: "text.secondary" }}>
                      {p.last_visit_at
                        ? dayjs(p.last_visit_at).format("D MMM YYYY")
                        : "-"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
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
      </TableContainer>
      )}

      <PatientImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={load}
      />
    </Box>
  );
}
