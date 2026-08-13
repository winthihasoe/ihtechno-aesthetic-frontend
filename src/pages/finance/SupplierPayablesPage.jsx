import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FilterListIcon from "@mui/icons-material/FilterList";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  createSupplierPayable,
  getSupplierPayables,
  getSuppliers,
} from "../../services/financeService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import { hasPermission } from "../../utils/accessUtils";
import useAuthStore from "../../stores/authStore";
import { formatKyats } from "../../utils/formatKyats";

const STATUS_OPTIONS = ["open", "partial", "closed", "void"];

const emptyFilters = {
  status: "",
  supplier_id: "",
};

const emptyForm = {
  supplier_id: "",
  total_amount: "",
  reference: "",
  description: "",
  due_date: "",
  consignment_usage_from: "",
  consignment_usage_to: "",
};

function statusColor(status) {
  if (status === "closed") return "success";
  if (status === "partial") return "warning";
  if (status === "void") return "default";
  return "primary";
}

/** Highlights open/partials with a payable due date approaching or overdue. */
function payableDueUrgency(row) {
  const st = row.status ?? "";
  if (!["open", "partial"].includes(st)) return null;
  if (!row.due_date) return null;
  const d = dayjs(row.due_date).startOf("day");
  const today = dayjs().startOf("day");
  const diff = d.diff(today, "day");
  if (diff < 0) return "overdue";
  if (diff <= 7) return "soon";
  return null;
}

export default function SupplierPayablesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { user } = useAuthStore();
  const { pushToast } = useToastStore();
  const canManage = hasPermission(user, "payments.manage");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [form, setForm] = useState(emptyForm);
  const consignmentPrefillConsumed = useRef(false);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const summary = useMemo(() => {
    const openRows = rows.filter((r) => ["open", "partial"].includes(r.status));
    const openBalance = openRows.reduce(
      (sum, r) => sum + Number(r.balance || 0),
      0,
    );
    const totalBalance = rows.reduce(
      (sum, r) => sum + Number(r.balance || 0),
      0,
    );
    let overdueDue = 0;
    let dueSoon = 0;
    for (const r of openRows) {
      const u = payableDueUrgency(r);
      if (u === "overdue") overdueDue += 1;
      else if (u === "soon") dueSoon += 1;
    }
    return {
      count: rows.length,
      openCount: openRows.length,
      openBalance,
      totalBalance,
      overdueDue,
      dueSoon,
    };
  }, [rows]);

  const load = useCallback(
    async (nextFilters = filters) => {
      setLoading(true);
      try {
        const params = Object.fromEntries(
          Object.entries(nextFilters).filter(([, value]) => value !== ""),
        );
        const data = await getSupplierPayables(params);
        setRows(Array.isArray(data) ? data : []);
      } catch (e) {
        pushToast({
          message: resolveApiError(e, "Failed to load payables."),
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [filters, pushToast],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const s = await getSuppliers().catch(() => []);
        setSuppliers(Array.isArray(s) ? s : []);
      } catch {
        /* Keep filters usable even when optional lookups fail. */
      }
    })();
  }, []);

  useEffect(() => {
    const from = searchParams.get("from");
    if (from !== "consignment") {
      consignmentPrefillConsumed.current = false;
      return;
    }
    if (consignmentPrefillConsumed.current) return;

    const supplierId = searchParams.get("supplier_id")?.trim();
    const amountRaw = searchParams.get("amount");
    const amountNum = Number(amountRaw);
    if (!supplierId || !Number.isFinite(amountNum) || amountNum <= 0) {
      setSearchParams({}, { replace: true });
      pushToast({
        message: "Invalid consignment payable prefill — open New payable manually.",
        severity: "warning",
      });
      return;
    }

    consignmentPrefillConsumed.current = true;

    const qty = searchParams.get("qty")?.trim() || "";
    const df = searchParams.get("df")?.trim() || "";
    const dt = searchParams.get("dt")?.trim() || "";
    const refTag = dayjs().format("YYYYMMDD");

    const period =
      df && dt
        ? `${dayjs(df).format("DD MMM YYYY")} → ${dayjs(dt).format("DD MMM YYYY")}`
        : df
          ? `from ${dayjs(df).format("DD MMM YYYY")}`
          : dt
            ? `to ${dayjs(dt).format("DD MMM YYYY")}`
            : "all dates in report";

    const descParts = [
      `Consignment usage (${period}).`,
      qty ? `Quantity used: ${qty}.` : null,
      "Amount from settlement at batch unit cost.",
    ].filter(Boolean);

    setForm({
      supplier_id: supplierId,
      total_amount: String(amountNum),
      reference: `CONS-${supplierId}-${refTag}`,
      description: descParts.join(" "),
      due_date: "",
      consignment_usage_from: df || "",
      consignment_usage_to: dt || "",
    });
    setOpen(true);
    pushToast({
      message: "Form prefilled from consignment settlement — review and save.",
      severity: "info",
    });
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, pushToast]);

  const applyFilters = () => {
    setFilters(draftFilters);
    load(draftFilters);
    if (isMobile) setFiltersExpanded(false);
  };

  const clearFilters = () => {
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
    load(emptyFilters);
  };

  const handleCreate = async () => {
    const isConsignmentPrefill = String(form.reference || "").startsWith("CONS-");
    if (isConsignmentPrefill) {
      if (!form.supplier_id || !form.consignment_usage_from || !form.consignment_usage_to) {
        pushToast({
          message:
            "Consignment payable must include supplier and both usage dates to keep paid status accurate.",
          severity: "warning",
        });
        return;
      }
    }

    setSaving(true);
    try {
      const key = `ap-${Date.now()}`;
      await createSupplierPayable(
        {
          supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
          total_amount: Number(form.total_amount),
          reference: form.reference || null,
          description: form.description || null,
          due_date: form.due_date || null,
          ...(form.consignment_usage_from &&
          form.consignment_usage_to &&
          form.supplier_id
            ? {
                consignment_usage_from: form.consignment_usage_from,
                consignment_usage_to: form.consignment_usage_to,
              }
            : {}),
        },
        key,
      );
      pushToast({ message: "Payable created.", severity: "success" });
      setOpen(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      pushToast({
        message: resolveApiError(e, "Create failed."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1280, mx: "auto" }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Supplier payables
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track supplier balances from inventory purchases and record cashier
            payments.
          </Typography>
        </Box>
        {canManage ? (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpen(true)}
          >
            New payable
          </Button>
        ) : null}
      </Stack>

      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
        Money the clinic owes suppliers for stock received. Watch the{" "}
        <strong>Balance</strong> and <strong>Due</strong> columns — overdue rows
        are flagged. Record part or full settlement with <strong>Pay</strong>; the
        status moves to <em>partial</em> then <em>paid</em> automatically.
      </Alert>

      {summary.overdueDue > 0 ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {summary.overdueDue} open payable
          {summary.overdueDue === 1 ? " is " : "s are "}past the due date. Check
          the Due column below.
        </Alert>
      ) : summary.dueSoon > 0 ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {summary.dueSoon} open payable
          {summary.dueSoon === 1 ? " has" : "s have"} a due date within 7 days.
        </Alert>
      ) : null}

      <Accordion
        expanded={statsExpanded}
        onChange={(_, expanded) => setStatsExpanded(expanded)}
        sx={{ mb: 1, borderRadius: 2, "&:before": { display: "none" } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={{ xs: 0.5, sm: 1 }}
            alignItems={{ xs: "flex-start", sm: "center" }}
            sx={{ width: "100%" }}
          >
            <Typography variant="subtitle2" fontWeight={700}>
              Payables overview
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              <Chip
                size="small"
                color="primary"
                variant="outlined"
                label={`${summary.openCount} open • ${formatKyats(summary.openBalance)}`}
                sx={{ fontWeight: 700, height: 24 }}
              />
              {summary.overdueDue > 0 ? (
                <Chip
                  size="small"
                  color="error"
                  variant="outlined"
                  label={`${summary.overdueDue} overdue`}
                  sx={{ fontWeight: 700, height: 24 }}
                />
              ) : null}
              {summary.dueSoon > 0 && summary.overdueDue === 0 ? (
                <Chip
                  size="small"
                  color="warning"
                  variant="outlined"
                  label={`${summary.dueSoon} due ≤7d`}
                  sx={{ fontWeight: 700, height: 24 }}
                />
              ) : null}
            </Stack>
          </Stack>
        </AccordionSummary>
        <AccordionDetails sx={{ pt: 0 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(4, 1fr)",
              },
              gap: 1.25,
            }}
          >
            {[
              ["Records", summary.count],
              ["Open bills", summary.openCount],
              ["Open balance", formatKyats(summary.openBalance)],
              ["Filtered balance", formatKyats(summary.totalBalance)],
            ].map(([label, value]) => (
              <Paper
                key={label}
                variant="outlined"
                sx={{
                  p: 1.25,
                  borderRadius: 2,
                  background: alpha(
                    theme.palette.primary.main,
                    theme.palette.mode === "dark" ? 0.08 : 0.04,
                  ),
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={700}
                  display="block"
                >
                  {label}
                </Typography>
                <Typography variant="subtitle2" fontWeight={800}>
                  {value}
                </Typography>
              </Paper>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>

      <Accordion
        expanded={filtersExpanded}
        onChange={(_, expanded) => setFiltersExpanded(expanded)}
        sx={{ mb: 1.5, borderRadius: 2, "&:before": { display: "none" } }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" spacing={1} alignItems="center">
            <FilterListIcon fontSize="small" color="primary" />
            <Typography fontWeight={700}>Filters</Typography>
            {activeFilterCount ? (
              <Chip size="small" label={activeFilterCount} color="primary" />
            ) : null}
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(4, 1fr)",
              },
              gap: 2,
            }}
          >
            <TextField
              select
              label="Status"
              size="small"
              value={draftFilters.status}
              onChange={(e) =>
                setDraftFilters((f) => ({ ...f, status: e.target.value }))
              }
            >
              <MenuItem value="">All statuses</MenuItem>
              {STATUS_OPTIONS.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Supplier"
              size="small"
              value={draftFilters.supplier_id}
              onChange={(e) =>
                setDraftFilters((f) => ({ ...f, supplier_id: e.target.value }))
              }
            >
              <MenuItem value="">All suppliers</MenuItem>
              {suppliers.map((supplier) => (
                <MenuItem key={supplier.id} value={String(supplier.id)}>
                  {supplier.name}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={applyFilters}
                sx={{ flex: 1 }}
              >
                Apply
              </Button>
              <Button variant="outlined" onClick={clearFilters}>
                Clear
              </Button>
            </Stack>
          </Box>
        </AccordionDetails>
      </Accordion>

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ p: 5, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer sx={{ overflowX: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Payable</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Reference</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell align="right">Paid</TableCell>
                  <TableCell align="right">Balance</TableCell>
                  <TableCell>Due</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => {
                  const urgency = payableDueUrgency(r);
                  return (
                    <TableRow
                      key={r.id}
                      hover
                      onClick={() => navigate(`./${r.id}`)}
                      sx={{
                        cursor: "pointer",
                        ...(urgency === "overdue"
                          ? {
                              bgcolor: alpha(
                                theme.palette.error.main,
                                theme.palette.mode === "dark" ? 0.12 : 0.06,
                              ),
                            }
                          : urgency === "soon"
                            ? {
                                bgcolor: alpha(
                                  theme.palette.warning.main,
                                  theme.palette.mode === "dark" ? 0.1 : 0.05,
                                ),
                              }
                            : {}),
                      }}
                    >
                      <TableCell>
                        <Typography fontWeight={700}>#{r.id}</Typography>
                      </TableCell>
                      <TableCell>{r.supplier?.name ?? "No supplier"}</TableCell>
                      <TableCell>
                        <Chip
                          label={r.status}
                          size="small"
                          color={statusColor(r.status)}
                          variant={r.status === "open" ? "filled" : "outlined"}
                          sx={{ fontWeight: 700, textTransform: "capitalize" }}
                        />
                      </TableCell>
                      <TableCell>{r.reference ?? "—"}</TableCell>
                      <TableCell align="right">
                        {formatKyats(Number(r.total_amount))}
                      </TableCell>
                      <TableCell align="right">
                        {formatKyats(Number(r.paid_amount || 0))}
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight={800}>
                          {formatKyats(Number(r.balance))}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ verticalAlign: "top" }}>
                        <Stack spacing={0.5} alignItems="flex-start">
                          <Typography variant="body2">
                            {r.due_date
                              ? dayjs(r.due_date).format("DD MMM YYYY")
                              : "—"}
                          </Typography>
                          {urgency === "overdue" ? (
                            <Chip
                              label="Overdue"
                              size="small"
                              color="error"
                              sx={{ height: 22 }}
                            />
                          ) : urgency === "soon" ? (
                            <Chip
                              label="Due soon"
                              size="small"
                              color="warning"
                              sx={{ height: 22 }}
                            />
                          ) : null}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!rows.length ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography
                        color="text.secondary"
                        sx={{ py: 3, textAlign: "center" }}
                      >
                        No supplier payables match the current filters.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <Dialog
        open={open}
        onClose={() => !saving && setOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 800 }}>New supplier payable</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Supplier (optional)"
              fullWidth
              value={form.supplier_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, supplier_id: e.target.value }))
              }
            >
              <MenuItem value="">None</MenuItem>
              {suppliers.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
            {form.consignment_usage_from && form.consignment_usage_to ? (
              <Alert severity="info" variant="outlined">
                Consignment usage period (sent to server for duplicate check):{" "}
                {dayjs(form.consignment_usage_from).format("DD MMM YYYY")} →{" "}
                {dayjs(form.consignment_usage_to).format("DD MMM YYYY")}{" "}
                (inclusive). Overlapping ranges for this supplier are rejected
                unless the other payable is voided.
              </Alert>
            ) : null}
            <TextField
              label="Total amount"
              type="number"
              fullWidth
              value={form.total_amount}
              onChange={(e) =>
                setForm((f) => ({ ...f, total_amount: e.target.value }))
              }
              slotProps={{ htmlInput: { min: 0.01, step: 0.01 } }}
            />
            <TextField
              label="Due date"
              type="date"
              fullWidth
              value={form.due_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, due_date: e.target.value }))
              }
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Reference"
              fullWidth
              value={form.reference}
              onChange={(e) =>
                setForm((f) => ({ ...f, reference: e.target.value }))
              }
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={2}
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={saving || !form.total_amount}
          >
            {saving ? <CircularProgress size={22} /> : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
