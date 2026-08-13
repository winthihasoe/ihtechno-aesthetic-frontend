import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
  Pagination,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import FilterListIcon from "@mui/icons-material/FilterList";
import BlockIcon from "@mui/icons-material/Block";
import EditIcon from "@mui/icons-material/Edit";
import dayjs from "dayjs";
import { alpha, useTheme } from "@mui/material/styles";
import { useLocation, useNavigate } from "react-router-dom";
import { formatKyats } from "../../utils/formatKyats";
import { hasPermission } from "../../utils/accessUtils";
import useAuthStore from "../../stores/authStore";
import useToastStore from "../../stores/toastStore";
import { resolveApiError } from "../../services/apiClient";
import {
  listOtherIncomes,
  voidOtherIncome,
} from "../../services/financeService";
import { useFinanceRowHighlight } from "../../components/finance/useFinanceRowHighlight";
import {
  financeHighlightCellSx,
  matchesOtherIncomeHighlight,
} from "../../utils/financeSourceNavigation";

const PAYMENT_METHODS = ["cash", "transfer", "card", "e-wallet", "other"];

const emptyFilters = {
  reference_number: "",
  chart_query: "",
  payment_method: "",
  status: "",
};

function groupByDate(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const key = dayjs(row.income_date).format("YYYY-MM-DD");
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(row);
  });
  return [...grouped.entries()].sort(([a], [b]) => b.localeCompare(a));
}

function matchesFilter(row, filters) {
  if (
    filters.reference_number &&
    !String(row.reference_number || "")
      .toLowerCase()
      .includes(filters.reference_number.toLowerCase())
  ) {
    return false;
  }
  if (filters.payment_method && row.payment_method !== filters.payment_method) {
    return false;
  }
  if (filters.status && row.status !== filters.status) {
    return false;
  }
  if (
    filters.chart_query &&
    !`${row.chart_of_account?.code || ""} ${row.chart_of_account?.name || ""}`
      .toLowerCase()
      .includes(filters.chart_query.toLowerCase())
  ) {
    return false;
  }
  return true;
}

export default function OtherIncomePage() {
  const theme = useTheme();
  const location = useLocation();
  const pendingHighlight = location.state?.financeHighlight ?? null;
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { pushToast } = useToastStore();
  const canView = hasPermission(user, "finance.other_income.view");
  const canManage = hasPermission(user, "finance.other_income.manage");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [voidRow, setVoidRow] = useState(null);
  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listOtherIncomes();
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not load other income."),
        severity: "error",
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(
    () => rows.filter((row) => matchesFilter(row, filters)),
    [filters, rows],
  );
  const PAGE_SIZE = 50;
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRows.slice(start, start + PAGE_SIZE);
  }, [filteredRows, page]);
  const grouped = useMemo(() => groupByDate(pagedRows), [pagedRows]);

  useEffect(() => {
    if (!pendingHighlight || filteredRows.length === 0) return;
    const idx = filteredRows.findIndex((row) =>
      matchesOtherIncomeHighlight(row, pendingHighlight),
    );
    if (idx >= 0) {
      setPage(Math.floor(idx / PAGE_SIZE) + 1);
    }
  }, [pendingHighlight, filteredRows]);

  const highlightMatch = useMemo(() => {
    if (!pendingHighlight) return null;
    return (
      pagedRows.find((row) => matchesOtherIncomeHighlight(row, pendingHighlight)) ??
      null
    );
  }, [pagedRows, pendingHighlight]);

  const { rowRef: highlightRowRef, highlightActive } = useFinanceRowHighlight({
    ready: !loading,
    found: Boolean(highlightMatch),
    onMissed: () => {
      pushToast({
        message: "That other income entry is not visible with the current filters.",
        severity: "info",
      });
    },
  });

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const submitVoid = async () => {
    if (!voidRow) return;
    setVoiding(true);
    try {
      await voidOtherIncome(voidRow.id, { void_reason: voidReason || null });
      pushToast({ message: "Other income voided.", severity: "success" });
      setVoidRow(null);
      setVoidReason("");
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not void other income."),
        severity: "error",
      });
    } finally {
      setVoiding(false);
    }
  };

  if (!canView) {
    return (
      <Alert severity="warning">
        You do not have permission to view other income.
      </Alert>
    );
  }

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Other Income
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track income not issued from invoices, grouped by recorded date.
          </Typography>
        </Box>
        {canManage && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate("new")}
          >
            New Income
          </Button>
        )}
      </Stack>

      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
        Record income that does <strong>not</strong> come from a patient invoice —
        e.g. cafeteria rent, sponsorships, training fees or bank interest. Each
        entry posts to a chart-of-account and appears in financial reports.
        Reverse a mistaken entry with <strong>Void</strong> rather than deleting.
      </Alert>

      <Accordion
        expanded={filtersExpanded}
        onChange={(_, expanded) => setFiltersExpanded(expanded)}
        sx={{
          mb: 2,
          "&:before": { display: "none" },
          boxShadow: "none",
          borderRadius: 2,
        }}
        variant="outlined"
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" spacing={1} alignItems="center">
            <FilterListIcon fontSize="small" color="action" />
            <Typography fontWeight={600}>Filters</Typography>
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              flexWrap="wrap"
            >
              <TextField
                label="Reference"
                size="small"
                value={draftFilters.reference_number}
                onChange={(event) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    reference_number: event.target.value,
                  }))
                }
                sx={{
                  minWidth: { xs: 0, md: 180 },
                  width: { xs: "100%", md: "auto" },
                }}
              />
              <TextField
                label="COA"
                size="small"
                value={draftFilters.chart_query}
                onChange={(event) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    chart_query: event.target.value,
                  }))
                }
                sx={{
                  minWidth: { xs: 0, md: 220 },
                  width: { xs: "100%", md: "auto" },
                }}
              />
              <TextField
                select
                label="Method"
                size="small"
                value={draftFilters.payment_method}
                onChange={(event) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    payment_method: event.target.value,
                  }))
                }
                sx={{
                  minWidth: { xs: 0, md: 170 },
                  width: { xs: "100%", md: "auto" },
                }}
              >
                <MenuItem value="">All</MenuItem>
                {PAYMENT_METHODS.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Status"
                size="small"
                value={draftFilters.status}
                onChange={(event) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    status: event.target.value,
                  }))
                }
                sx={{
                  minWidth: { xs: 0, md: 150 },
                  width: { xs: "100%", md: "auto" },
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="posted">Posted</MenuItem>
                <MenuItem value="void">Void</MenuItem>
              </TextField>
            </Stack>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button
                variant="contained"
                onClick={() => setFilters(draftFilters)}
              >
                Apply Filters
              </Button>
              <Button
                variant="text"
                onClick={() => {
                  setDraftFilters(emptyFilters);
                  setFilters(emptyFilters);
                }}
              >
                Clear
              </Button>
            </Stack>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {loading ? (
        <CircularProgress size={24} />
      ) : grouped.length === 0 ? (
        <Alert severity="info">No other income entries found.</Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Reference #</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Chart of Account</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Amount
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Action
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {grouped.map(([dateKey, dateRows]) => {
                const sum = dateRows.reduce(
                  (total, row) => total + Number(row.amount || 0),
                  0,
                );
                return (
                  <Fragment key={dateKey}>
                    <TableRow
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.06),
                        "& td": { borderBottomColor: "divider", py: 1 },
                      }}
                    >
                      <TableCell colSpan={6}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          flexWrap="wrap"
                          gap={1}
                        >
                          <Typography fontWeight={700}>
                            {dayjs(dateKey).format("D MMM YYYY")}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {dateRows.length} entr
                            {dateRows.length === 1 ? "y" : "ies"} •{" "}
                            {formatKyats(sum)}
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                    {dateRows.map((row) => {
                      const isHighlightRow = matchesOtherIncomeHighlight(
                        row,
                        pendingHighlight,
                      );
                      const highlightReference =
                        isHighlightRow &&
                        highlightActive &&
                        pendingHighlight?.highlightColumn === "reference";
                      const highlightSourceId =
                        isHighlightRow &&
                        highlightActive &&
                        (pendingHighlight?.highlightColumn === "sourceId" ||
                          pendingHighlight?.highlightColumn === "row");

                      return (
                      <TableRow
                        key={row.id}
                        hover
                        ref={isHighlightRow ? highlightRowRef : undefined}
                      >
                        <TableCell
                          sx={financeHighlightCellSx(
                            highlightSourceId || highlightReference,
                          )}
                        >
                          {highlightSourceId ? (
                            <Typography
                              component="span"
                              variant="caption"
                              sx={{
                                display: "block",
                                fontVariantNumeric: "tabular-nums",
                                fontWeight: 700,
                                color: "info.main",
                              }}
                            >
                              ID #{row.id}
                            </Typography>
                          ) : null}
                          {row.reference_number || "-"}
                        </TableCell>
                        <TableCell>
                          {row.chart_of_account?.code} -{" "}
                          {row.chart_of_account?.name}
                        </TableCell>
                        <TableCell sx={{ textTransform: "capitalize" }}>
                          {row.payment_method || "-"}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={
                              row.status === "void" ? "default" : "success"
                            }
                            label={row.status === "void" ? "Void" : "Posted"}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {formatKyats(row.amount)}
                        </TableCell>
                        <TableCell align="right">
                          <Stack
                            direction="row"
                            justifyContent="flex-end"
                            spacing={1}
                          >
                            {canManage && row.status !== "void" && (
                              <>
                                <Button
                                  size="small"
                                  startIcon={<EditIcon />}
                                  onClick={() => navigate(`${row.id}/edit`)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="small"
                                  color="warning"
                                  startIcon={<BlockIcon />}
                                  onClick={() => setVoidRow(row)}
                                >
                                  Void
                                </Button>
                              </>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                    })}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!loading && filteredRows.length > PAGE_SIZE && (
        <Stack direction="row" justifyContent="center" mt={2}>
          <Pagination
            page={page}
            count={pageCount}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Stack>
      )}

      <Dialog
        open={Boolean(voidRow)}
        onClose={() => setVoidRow(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Void Other Income</DialogTitle>
        <DialogContent>
          <Typography variant="body2" mb={2}>
            This keeps the record but marks it void and creates reversing
            finance entries.
          </Typography>
          <TextField
            label="Reason (optional)"
            value={voidReason}
            onChange={(event) => setVoidReason(event.target.value)}
            fullWidth
            multiline
            minRows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVoidRow(null)} disabled={voiding}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="warning"
            onClick={submitVoid}
            disabled={voiding}
          >
            Confirm Void
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
