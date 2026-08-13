import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Box,
  Typography,
  Button,
  Chip,
  Paper,
  Stack,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  MenuItem,
  Menu,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
} from "@mui/material";
import LoadingIndicator from "../components/common/LoadingIndicator";
import GuidedEmptyState from "../components/common/GuidedEmptyState";
import AddIcon from "@mui/icons-material/Add";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import PublishedWithChangesOutlinedIcon from "@mui/icons-material/PublishedWithChangesOutlined";
import SortIcon from "@mui/icons-material/Sort";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import useAuthStore from "../stores/authStore";
import { getForms, createForm } from "../services/formService";
import { hasRole } from "../utils/accessUtils";
import { getWorkspaceUrlPrefix } from "../utils/workspaceRoutes";

const FORMS_PREFS_KEY = "dermafairy_forms_explorer_prefs";

const DEFAULT_PREFS = {
  quickType: "all",
  statusFilter: "all",
  sortBy: "updated_at",
  sortDir: "desc",
  search: "",
};

const EMPTY_STEPS = [
  {
    icon: AddIcon,
    title: "Create a form",
    body: "Start with a name and type — questionnaire, consent, intake, or other — then open the builder to add fields.",
  },
  {
    icon: BuildOutlinedIcon,
    title: "Design fields",
    body: "Arrange sections, question types, and conditional rules in the form editor until the draft matches your clinic workflow.",
  },
  {
    icon: PublishedWithChangesOutlinedIcon,
    title: "Publish and activate",
    body: "Publish a version and keep the form active so staff can capture responses during visits and linked treatments.",
  },
];

function readStoredPrefs() {
  try {
    const raw = localStorage.getItem(FORMS_PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      quickType:
        parsed?.quickType === "questionnaire" || parsed?.quickType === "consent"
          ? parsed.quickType
          : "all",
      sortBy: parsed?.sortBy === "name" ? "name" : "updated_at",
      sortDir: parsed?.sortDir === "asc" ? "asc" : "desc",
      statusFilter:
        parsed?.statusFilter === "usable" ||
        parsed?.statusFilter === "inactive" ||
        parsed?.statusFilter === "draft_only"
          ? parsed.statusFilter
          : "all",
      search: typeof parsed?.search === "string" ? parsed.search : "",
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function humanizeFormType(type) {
  return String(type || "other")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getTimestampValue(...values) {
  const value = values.find((item) => dayjs(item).isValid());
  return value ?? null;
}

function getFormSortTime(form) {
  const timestamp = getTimestampValue(
    form?.updated_at,
    form?.draft_version?.updated_at,
    form?.published_version?.updated_at,
    form?.created_at,
    form?.draft_version?.created_at,
    form?.published_version?.created_at,
  );
  return timestamp ? dayjs(timestamp).valueOf() : 0;
}

function getFormActivityMeta(form) {
  const createdAt = getTimestampValue(
    form?.created_at,
    form?.draft_version?.created_at,
    form?.published_version?.created_at,
  );
  const updatedAt = getTimestampValue(
    form?.updated_at,
    form?.draft_version?.updated_at,
    form?.published_version?.updated_at,
    createdAt,
  );

  if (!createdAt && !updatedAt) {
    return { label: "Created", value: "Date unavailable" };
  }

  const created = dayjs(createdAt ?? updatedAt);
  const updated = dayjs(updatedAt ?? createdAt);
  const shouldShowCreated = !updatedAt || created.isSame(updated, "day");
  const displayDate = shouldShowCreated ? created : updated;

  return {
    label: shouldShowCreated ? "Created" : "Updated",
    value: displayDate.format("DD-MM-YYYY hh:mm A"),
  };
}

function getCreatorLabel(form) {
  if (form?.creator?.role === "developer") {
    return "System";
  }

  return (
    form?.creator?.name ||
    (form?.created_by ? `User #${form.created_by}` : "Unknown")
  );
}

export default function FormsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const workspacePrefix = getWorkspaceUrlPrefix(user);
  const canManage = hasRole(user, "admin");

  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => readStoredPrefs().search);
  const [quickType, setQuickType] = useState(() => readStoredPrefs().quickType);
  const [statusFilter, setStatusFilter] = useState(
    () => readStoredPrefs().statusFilter,
  );
  const [sortBy, setSortBy] = useState(() => readStoredPrefs().sortBy);
  const [sortDir, setSortDir] = useState(() => readStoredPrefs().sortDir);
  const [error, setError] = useState("");
  const [sortByAnchorEl, setSortByAnchorEl] = useState(null);
  const [sortDirAnchorEl, setSortDirAnchorEl] = useState(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState("other");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getForms();
      setForms(data);
    } catch {
      setError("Could not load forms. Make sure the server is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    localStorage.setItem(
      FORMS_PREFS_KEY,
      JSON.stringify({ quickType, statusFilter, sortBy, sortDir, search }),
    );
  }, [quickType, statusFilter, sortBy, sortDir, search]);

  const filtered = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const next = forms
      .filter((f) =>
        String(f.name ?? "")
          .toLowerCase()
          .includes(normalizedSearch),
      )
      .filter((f) => {
        if (quickType === "all") return true;
        return String(f.form_type ?? "other") === quickType;
      })
      .filter((f) => {
        const usable = Boolean(
          f.is_usable ?? (f.is_active && f.published_version),
        );
        if (statusFilter === "usable") return usable;
        if (statusFilter === "inactive") {
          return Boolean(f.published_version) && !f.is_active;
        }
        if (statusFilter === "draft_only") return !f.published_version;
        return true;
      });
    next.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") {
        cmp = String(a.name ?? "").localeCompare(String(b.name ?? ""));
      } else {
        const aTime = getFormSortTime(a);
        const bTime = getFormSortTime(b);
        cmp = aTime - bTime;
      }
      if (cmp === 0) {
        cmp = Number(a.id ?? 0) - Number(b.id ?? 0);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return next;
  }, [forms, search, quickType, statusFilter, sortBy, sortDir]);

  const showGuidedEmpty = !loading && !error && forms.length === 0;
  const showFilteredEmpty =
    !loading && forms.length > 0 && filtered.length === 0;

  // ── Create ─────────────────────────────────
  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const form = await createForm({
        name: newName.trim(),
        description: newDesc.trim(),
        form_type: newType,
      });
      setCreateOpen(false);
      setNewName("");
      setNewDesc("");
      setNewType("other");
      // Go straight to the builder for the new form
      navigate(`${workspacePrefix}/forms/${form.id}/edit`);
    } catch {
      setError("Failed to create form.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Box sx={{ pb: 3 }}>
      {/* Header */}
      <Paper
        variant="outlined"
        sx={{
          mb: 2.5,
          p: { xs: 2, sm: 2.5 },
          borderRadius: 2,
          borderColor: "divider",
          background: "background.default",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <Box sx={{ width: "100%" }}>
            <Typography variant="overline" color="primary" fontWeight={800}>
              Clinic forms
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ mt: 0.25 }}>
              Forms Library
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Create, customise, and manage intake, consent, and procedure forms
              for clinic workflows.
            </Typography>
          </Box>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{
              alignSelf: { xs: "stretch", sm: "center" },
              justifyContent: { xs: "space-between", sm: "flex-end" },
              flexShrink: 0,
            }}
          >
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Tooltip
                title={`Sort by: ${sortBy === "updated_at" ? "Last Updated" : "Name"}`}
              >
                <IconButton
                  size="small"
                  aria-label="Sort by options"
                  onClick={(event) => setSortByAnchorEl(event.currentTarget)}
                  sx={{ border: "1px solid", borderColor: "divider" }}
                >
                  <SortIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip
                title={`Direction: ${sortDir === "desc" ? "Descending" : "Ascending"}`}
              >
                <IconButton
                  size="small"
                  aria-label="Direction options"
                  onClick={(event) => setSortDirAnchorEl(event.currentTarget)}
                  sx={{ border: "1px solid", borderColor: "divider" }}
                >
                  <SwapVertIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
            {canManage && !showGuidedEmpty ? (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateOpen(true)}
                sx={{
                  borderRadius: 999,
                  px: 2.25,
                  py: 1,
                  fontWeight: 800,
                  boxShadow: "0 10px 24px rgba(25, 118, 210, 0.24)",
                  whiteSpace: "nowrap",
                }}
              >
                Create Form
              </Button>
            ) : null}
          </Stack>
          <Menu
            anchorEl={sortByAnchorEl}
            open={Boolean(sortByAnchorEl)}
            onClose={() => setSortByAnchorEl(null)}
          >
            <MenuItem
              selected={sortBy === "updated_at"}
              onClick={() => {
                setSortBy("updated_at");
                setSortByAnchorEl(null);
              }}
            >
              Last Updated
            </MenuItem>
            <MenuItem
              selected={sortBy === "name"}
              onClick={() => {
                setSortBy("name");
                setSortByAnchorEl(null);
              }}
            >
              Name
            </MenuItem>
          </Menu>
          <Menu
            anchorEl={sortDirAnchorEl}
            open={Boolean(sortDirAnchorEl)}
            onClose={() => setSortDirAnchorEl(null)}
          >
            <MenuItem
              selected={sortDir === "desc"}
              onClick={() => {
                setSortDir("desc");
                setSortDirAnchorEl(null);
              }}
            >
              Descending
            </MenuItem>
            <MenuItem
              selected={sortDir === "asc"}
              onClick={() => {
                setSortDir("asc");
                setSortDirAnchorEl(null);
              }}
            >
              Ascending
            </MenuItem>
          </Menu>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Explorer toolbar */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "center" }}
        spacing={1.5}
        sx={{ mb: 1.75 }}
      >
        <TextField
          placeholder="Search by form title..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: { xs: "100%", md: 280 } }}
        />

        <Stack direction="row" spacing={1.5}>
          <ToggleButtonGroup
            exclusive
            value={quickType}
            onChange={(_, value) => value && setQuickType(value)}
            size="small"
            sx={{
              alignSelf: {
                xs: "flex-start",
                md: "center",
                color: "text.secondary",
              },
            }}
          >
            <ToggleButton value="all" aria-label="All forms">
              <Typography variant="body2" color="white">
                All
              </Typography>
            </ToggleButton>
            <ToggleButton value="questionnaire" aria-label="Questionnaires">
              <Typography variant="body2" color="white">
                Questionnaires
              </Typography>
            </ToggleButton>
            <ToggleButton value="consent" aria-label="Consents">
              <Typography variant="body2" color="white">
                Consents
              </Typography>
            </ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            exclusive
            value={statusFilter}
            onChange={(_, value) => value && setStatusFilter(value)}
            size="small"
          >
            <ToggleButton value="all">All status</ToggleButton>
            <ToggleButton value="usable">Active</ToggleButton>
            <ToggleButton value="inactive">Inactive</ToggleButton>
            <ToggleButton value="draft_only">Draft only</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      {/* Forms explorer */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : showGuidedEmpty ? (
        <GuidedEmptyState
          icon={AssignmentOutlinedIcon}
          title="No forms yet"
          description="Build intake questionnaires, consent forms, and procedure checklists here. Create your first form, add fields in the builder, then publish so staff can capture responses during visits."
          primaryAction={
            canManage
              ? {
                  label: "Create form",
                  onClick: () => setCreateOpen(true),
                  startIcon: <AddIcon />,
                }
              : null
          }
          steps={EMPTY_STEPS}
          footer="Consent and procedure forms can be linked to treatment templates after publishing."
        />
      ) : showFilteredEmpty ? (
        <Box
          sx={{
            textAlign: "center",
            py: 10,
            color: "text.secondary",
          }}
        >
          <AssignmentIcon sx={{ fontSize: 56, opacity: 0.2, mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            No forms match your filters
          </Typography>
          <Typography variant="body2">
            Try a different search term, type, or status filter.
          </Typography>
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            borderRadius: 2,
            borderColor: "divider",
            overflowX: "auto",
            bgcolor: "background.paper",
          }}
        >
          <Table sx={{ minWidth: 760 }} aria-label="Forms table">
            <TableHead>
              <TableRow
                sx={{
                  "& th": {
                    bgcolor: "background.paper",
                    color: "text.secondary",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  },
                }}
              >
                <TableCell sx={{ width: 65 }}>No.</TableCell>
                <TableCell>Form</TableCell>
                <TableCell align="right" sx={{ width: 240 }}>
                  Created
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((form, index) => (
                <FormTableRow
                  key={form.id}
                  form={form}
                  index={index}
                  onView={() => navigate(`${workspacePrefix}/forms/${form.id}`)}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── Create Dialog ─────────────────────────── */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Create New Form</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Form Name"
              placeholder="e.g. Botox Consent Form"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              fullWidth
              autoFocus
              helperText="Give the form a clear, descriptive name that staff will recognise."
            />
            <TextField
              label="Description (optional)"
              placeholder="What is this form used for?"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              select
              label="Form Type"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="questionnaire">Questionnaire</MenuItem>
              <MenuItem value="consent">Consent</MenuItem>
              <MenuItem value="intake">Intake</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setCreateOpen(false)}
            sx={{ borderRadius: 999 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
            sx={{ borderRadius: 999, fontWeight: 600 }}
          >
            {creating ? "Creating…" : "Create & Add Fields →"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ──────────────────────────────────────────────────
// Form Table Row
// ──────────────────────────────────────────────────
function FormTableRow({ form, index, onView }) {
  const activity = getFormActivityMeta(form);
  const formType = humanizeFormType(form?.form_type);
  const creatorName = getCreatorLabel(form);
  const hasPublished = Boolean(form?.published_version);
  const hasDraft = Boolean(form?.draft_version);
  const version = form?.version ?? form?.published_version?.version_number ?? 1;

  return (
    <TableRow
      hover
      role="button"
      tabIndex={0}
      onClick={onView}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onView();
        }
      }}
      sx={{
        cursor: "pointer",
        transition: "background-color 0.2s ease",
        "&:hover": {
          bgcolor: "action.hover",
        },
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: -2,
        },
      }}
    >
      <TableCell
        sx={{
          color: "text.secondary",
          fontWeight: 600,
          verticalAlign: "top",
          pt: 2.25,
          whiteSpace: "nowrap",
        }}
      >
        {index + 1}
      </TableCell>
      <TableCell sx={{ minWidth: 420 }}>
        <Stack spacing={1} sx={{ minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ minWidth: 0, flexWrap: "wrap" }}
          >
            <Typography
              variant="subtitle1"
              fontWeight={600}
              title={form.name}
              sx={{
                minWidth: 0,
                maxWidth: "100%",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {form.name || "Untitled form"}
            </Typography>
            <Chip
              label={`v${version}`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 700 }}
            />
          </Stack>

          {form?.description ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                fontSize: "0.7rem",
              }}
            >
              {form.description}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No description added yet.
            </Typography>
          )}

          <Stack
            direction="row"
            spacing={0.75}
            sx={{ flexWrap: "wrap", gap: 0.75 }}
          >
            <Chip label={formType} size="small" />
            <Chip
              label={hasPublished ? "Published" : "Draft only"}
              size="small"
              variant="outlined"
            />
            {hasPublished ? (
              <Chip
                label={form?.is_active ? "Activated" : "Deactivated"}
                size="small"
                color={form?.is_active ? "success" : "default"}
                variant={form?.is_active ? "filled" : "outlined"}
              />
            ) : null}
            {hasDraft && (
              <Chip
                label={`Draft v${form.draft_version.version_number}`}
                size="small"
                color="info"
                variant="outlined"
              />
            )}
            <Chip
              label={`${form?.fields_count ?? 0} fields`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`${form?.responses_count ?? 0} responses`}
              size="small"
              variant="outlined"
            />
          </Stack>
        </Stack>
      </TableCell>
      <TableCell align="right" sx={{ minWidth: 220, verticalAlign: "top" }}>
        <Stack spacing={0.75}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Created by
          </Typography>
          <Typography variant="body2" fontWeight={700}>
            {creatorName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {activity.label}: {activity.value}
          </Typography>
        </Stack>
      </TableCell>
    </TableRow>
  );
}
