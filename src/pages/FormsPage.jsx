import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  alpha,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import dayjs from "dayjs";
import useAuthStore from "../stores/authStore";
import { getForms, createForm } from "../services/formService";
import { hasRole } from "../utils/accessUtils";
import { getWorkspaceUrlPrefix } from "../utils/workspaceRoutes";

const FORM_TYPE_META = {
  questionnaire: { label: "Questionnaire", color: "info" },
  consent: { label: "Consent", color: "warning", filled: true },
  intake: { label: "Intake", color: "primary" },
  procedure: {
    label: "Procedure",
    filled: true,
    sx: {
      fontWeight: 700,
      bgcolor: "primary.dark",
      color: "#fff",
      border: "none",
    },
  },
  other: { label: "Document", color: "default" },
};

const TYPE_FILTERS = [
  { value: "", label: "All types" },
  { value: "intake", label: "Intake" },
  { value: "questionnaire", label: "Questionnaire" },
  { value: "consent", label: "Consent" },
  { value: "procedure", label: "Procedure" },
  { value: "other", label: "Document" },
];

export default function FormsPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const workspacePrefix = getWorkspaceUrlPrefix(user);
  const canManage = hasRole(user, "admin");

  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState("intake");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getForms();
      setForms(Array.isArray(data) ? data : []);
    } catch {
      setError("Could not load forms.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return forms
      .filter((f) => {
        const matchesSearch =
          !q ||
          String(f.name ?? "").toLowerCase().includes(q) ||
          String(f.description ?? "").toLowerCase().includes(q);
        const matchesType = !typeFilter || String(f.form_type ?? "other") === typeFilter;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
  }, [forms, search, typeFilter]);

  const stats = useMemo(
    () => ({
      total: forms.length,
      consents: forms.filter((f) => f.form_type === "consent").length,
      active: forms.filter((f) => f.is_active !== false).length,
    }),
    [forms],
  );

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
      setNewType("intake");
      navigate(`${workspacePrefix}/forms/${form.id}/edit`);
    } catch {
      setError("Failed to create form.");
    } finally {
      setCreating(false);
    }
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
            Forms
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Clinic intake, consent and documentation forms — open any form to
            preview the printable layout.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip
            size="small"
            label={`${stats.total} forms`}
            icon={<AssignmentOutlinedIcon sx={{ fontSize: "16px !important" }} />}
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
          <Chip size="small" variant="outlined" label={`${stats.consents} consents`} />
          {canManage && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
              New Form
            </Button>
          )}
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}` }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            size="small"
            placeholder="Search form or description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
            label="Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            {TYPE_FILTERS.map((t) => (
              <MenuItem key={t.value} value={t.value}>
                {t.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

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
                  <TableCell sx={{ fontWeight: 700 }}>Form</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">
                    Fields
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Updated</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 72 }} align="right">
                    Open
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ py: 6 }}>
                      <Stack alignItems="center" spacing={1}>
                        <AssignmentOutlinedIcon color="disabled" sx={{ fontSize: 40 }} />
                        <Typography variant="body2" color="text.secondary">
                          No forms match your search.
                        </Typography>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((form) => {
                    const typeMeta = FORM_TYPE_META[form.form_type] ?? FORM_TYPE_META.other;
                    const isActive = form.is_active !== false;
                    const fieldsCount = form.fields_count ?? form.fields?.length ?? 0;
                    return (
                      <TableRow
                        key={form.id}
                        hover
                        sx={{ cursor: "pointer" }}
                        onClick={() => navigate(`${workspacePrefix}/forms/${form.id}`)}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {form.name}
                          </Typography>
                          {form.description && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: "block",
                                maxWidth: 420,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {form.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={typeMeta.label}
                            color={typeMeta.color}
                            variant={typeMeta.filled ? "filled" : "outlined"}
                            sx={{
                              ...(typeMeta.filled ? { fontWeight: 700 } : null),
                              ...typeMeta.sx,
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">{fieldsCount}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={isActive ? "Active" : "Draft"}
                            color={isActive ? "success" : "default"}
                            variant={isActive ? "filled" : "outlined"}
                          />
                        </TableCell>
                        <TableCell sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
                          {form.updated_at ? dayjs(form.updated_at).format("D MMM YYYY") : "—"}
                        </TableCell>
                        <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                          <Tooltip title="Open form">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`${workspacePrefix}/forms/${form.id}`)}
                            >
                              <VisibilityOutlinedIcon fontSize="small" />
                            </IconButton>
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

      {/* ── Create Dialog ─────────────────────────── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Create New Form</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Form Name"
              placeholder="e.g. Consent for Surgery / Procedure"
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
              <MenuItem value="intake">Intake</MenuItem>
              <MenuItem value="questionnaire">Questionnaire</MenuItem>
              <MenuItem value="consent">Consent</MenuItem>
              <MenuItem value="procedure">Procedure</MenuItem>
              <MenuItem value="other">Document</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
            sx={{ fontWeight: 600 }}
          >
            {creating ? "Creating…" : "Create & Add Fields →"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
