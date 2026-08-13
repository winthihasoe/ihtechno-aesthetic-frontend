import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  TextField,
  Button,
  Divider,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import {
  CollapsibleFiltersPanel,
  CollapsibleFiltersToggle,
} from "../../components/common/CollapsibleFilters";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AssessmentIcon from "@mui/icons-material/Assessment";
import dayjs from "dayjs";
import {
  downloadReportExport,
  getReportBySlug,
} from "../../services/financeService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import { formatKyats } from "../../utils/formatKyats";

const EXPORT_SLUGS = [
  { exportType: "revenue", label: "Revenue" },
  { exportType: "expenses", label: "Expenses" },
  { exportType: "profit", label: "Profit summary" },
  { exportType: "cash-flow", label: "Cash flow" },
  { exportType: "reconciliation", label: "Reconciliation" },
  { exportType: "statements", label: "Ledger statements" },
  { exportType: "receivables", label: "Receivables list" },
  { exportType: "payables", label: "Payables list" },
  { exportType: "package-liability", label: "Package liability" },
  { exportType: "package-refunds", label: "Package refunds" },
  { exportType: "package-trade-ins", label: "Package trade-ins" },
  { exportType: "commission-clawback", label: "Commission clawback" },
  { exportType: "treatment-profitability", label: "Treatment profitability" },
];

const defaultDateRange = () => ({
  from: dayjs().startOf("month").format("YYYY-MM-DD"),
  to: dayjs().format("YYYY-MM-DD"),
});

function money(n) {
  return formatKyats(Number(n || 0));
}

function StatCard({ title, value, caption, color = "primary" }) {
  const theme = useTheme();
  const c = theme.palette[color]?.main ?? theme.palette.primary.main;
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.25,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        height: "100%",
        minHeight: { xs: 0, sm: 148 },
        display: "flex",
        flexDirection: "column",
        width: "100%",
        bgcolor: "background.paper",
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, letterSpacing: 0.02 }}
      >
        {title}
      </Typography>
      <Typography
        variant="h5"
        sx={{ fontWeight: 800, mt: 0.5, color: "text.primary" }}
      >
        {value}
      </Typography>
      {caption ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: "auto", pt: 1.5, lineHeight: 1.5 }}
        >
          {caption}
        </Typography>
      ) : null}
    </Paper>
  );
}

function KeyValueList({ rows }) {
  return (
    <Stack spacing={0} divider={<Divider flexItem sx={{ opacity: 0.6 }} />}>
      {rows.map((row) => (
        <Stack
          key={row.label}
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={2}
          sx={{ py: 1.25 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="body2"
              color="text.primary"
              sx={{ fontWeight: 600 }}
            >
              {row.label}
            </Typography>
            {row.hint ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.25 }}
              >
                {row.hint}
              </Typography>
            ) : null}
          </Box>
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, textAlign: "right", flexShrink: 0 }}
          >
            {row.value}
          </Typography>
        </Stack>
      ))}
    </Stack>
  );
}

function ExportRow({ exportType, label, onCsv, onPdf }) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      alignItems={{ sm: "center" }}
      justifyContent="space-between"
      spacing={1}
      sx={{ py: 1 }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadIcon />}
          onClick={() => onCsv(exportType)}
        >
          Spreadsheet (CSV)
        </Button>
        <Button
          size="small"
          variant="text"
          startIcon={<PictureAsPdfIcon />}
          onClick={() => onPdf(exportType)}
        >
          Print / save as PDF
        </Button>
      </Stack>
    </Stack>
  );
}

function SectionShell({ title, description, actions, children, sx }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        height: "100%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        ...sx,
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2,
          flexShrink: 0,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: (t) =>
            alpha(
              t.palette.primary.main,
              t.palette.mode === "dark" ? 0.08 : 0.04,
            ),
        }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          justifyContent="space-between"
          alignItems={{ sm: "flex-start" }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              {title}
            </Typography>
            {description ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5, maxWidth: 720, lineHeight: 1.6 }}
              >
                {description}
              </Typography>
            ) : null}
          </Box>
          {actions ? <Box sx={{ flexShrink: 0 }}>{actions}</Box> : null}
        </Stack>
      </Box>
      <Box
        sx={{
          p: 2.5,
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </Box>
    </Paper>
  );
}

export default function FinanceReportsPage() {
  const theme = useTheme();
  const { pushToast } = useToastStore();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftDates, setDraftDates] = useState(defaultDateRange);
  const [appliedDates, setAppliedDates] = useState(defaultDateRange);
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState({});

  const activeFilterCount = useMemo(() => {
    const defaults = defaultDateRange();
    let count = 0;
    if (appliedDates.from !== defaults.from) count += 1;
    if (appliedDates.to !== defaults.to) count += 1;
    return count;
  }, [appliedDates.from, appliedDates.to]);

  const queryParams = useMemo(() => {
    const p = {};
    if (appliedDates.from) p.from_date = appliedDates.from;
    if (appliedDates.to) p.to_date = appliedDates.to;
    return p;
  }, [appliedDates.from, appliedDates.to]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const keys = [
      "revenue",
      "expenses",
      "profit",
      "cash-flow",
      "reconciliation",
      "statements",
      "receivables",
      "unpaid-visits",
      "payables",
      "package-liability",
      "package-refunds",
      "package-trade-ins",
      "commission-clawback",
      "treatment-profitability",
    ];
    try {
      const next = {};
      for (const key of keys) {
        try {
          next[key] = await getReportBySlug(key, queryParams);
        } catch (e) {
          next[key] = {
            _error: resolveApiError(e, "Could not load this section."),
          };
        }
      }
      setSnapshot(next);
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const applyFilters = () => {
    setAppliedDates({ ...draftDates });
  };

  const clearFilters = () => {
    const next = defaultDateRange();
    setDraftDates(next);
    setAppliedDates(next);
  };

  const handleExport = async (exportType, format) => {
    try {
      await downloadReportExport(exportType, { ...queryParams, format });
      pushToast({
        message: "Your download should begin shortly.",
        severity: "success",
      });
    } catch (e) {
      pushToast({
        message: resolveApiError(e, "Export failed."),
        severity: "error",
      });
    }
  };

  const rev = snapshot.revenue;
  const exp = snapshot.expenses;
  const prof = snapshot.profit;
  const cf = snapshot["cash-flow"];
  const recon = snapshot.reconciliation;
  const stmt = snapshot.statements;
  const ar = snapshot.receivables;
  const unpaidVisits = snapshot["unpaid-visits"];
  const ap = snapshot.payables;
  const pkg = snapshot["package-liability"];
  const pkgRefunds = snapshot["package-refunds"];
  const pkgTradeIns = snapshot["package-trade-ins"];
  const clawback = snapshot["commission-clawback"];
  const tp = snapshot["treatment-profitability"];

  const dateRangeLabel =
    appliedDates.from && appliedDates.to
      ? `${dayjs(appliedDates.from).format("D MMM YYYY")} – ${dayjs(appliedDates.to).format("D MMM YYYY")}`
      : "—";

  const technicalPayload = useMemo(
    () =>
      JSON.stringify(
        {
          filters: {
            fromDate: appliedDates.from,
            toDate: appliedDates.to,
          },
          snapshot,
        },
        null,
        2,
      ),
    [snapshot, appliedDates.from, appliedDates.to],
  );

  const metricsGrid = {
    display: "grid",
    gap: 2,
    mb: 3,
    width: "100%",
    gridTemplateColumns: {
      xs: "repeat(2, minmax(0, 1fr))",
      sm: "repeat(2, minmax(0, 1fr))",
      md: "repeat(2, minmax(0, 1fr))",
      lg: "repeat(4, minmax(0, 1fr))",
    },
    alignItems: "stretch",
  };

  const dashboardGrid = {
    display: "grid",
    width: "100%",
    gap: { xs: 2, md: 2.5 },
    gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
    alignItems: "stretch",
  };

  const spanFull = { gridColumn: "1 / -1" };
  const spanHalf = {
    gridColumn: { xs: "1 / -1", md: "span 6" },
    minWidth: 0,
    display: "flex",
  };

  const tableAreaSx = {
    flex: 1,
    minHeight: 0,
    maxHeight: { xs: 220, sm: 260, md: 300 },
    borderRadius: 1,
    border: 1,
    borderColor: "divider",
  };

  return (
    <Box
      sx={{
        p: { xs: 2, md: 3 },
        pb: 6,
        width: "100%",
        maxWidth: { xs: "100%", md: 1280 },
        mx: "auto",
        boxSizing: "border-box",
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", sm: "flex-start" }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(theme.palette.primary.main, 0.12),
              color: "primary.main",
            }}
          >
            <AssessmentIcon />
          </Box>
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 800, letterSpacing: "-0.02em" }}
            >
              Financial Overview
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ lineHeight: 1.6 }}
            >
              See how the clinic is doing in plain language: money in, money
              out, what customers still owe, and what you owe suppliers. Use the
              date range to focus on a month or quarter. Exports are
              optional—use them for accounting or meetings.
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1 }}
            >
              Showing: <strong>{dateRangeLabel}</strong>
              {loading ? " · refreshing…" : ""}
            </Typography>
          </Box>
        </Stack>
        <CollapsibleFiltersToggle
          open={filtersOpen}
          onToggle={setFiltersOpen}
          activeCount={activeFilterCount}
          size="small"
        />
      </Stack>

      <CollapsibleFiltersPanel
        open={filtersOpen}
        onApply={applyFilters}
        onClear={clearFilters}
        applyLabel="Update numbers"
      >
        <Box
          sx={{
            display: "grid",
            gap: 2,
            width: "100%",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
            },
          }}
        >
          <TextField
            label="From date"
            type="date"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={draftDates.from}
            onChange={(e) =>
              setDraftDates((prev) => ({ ...prev, from: e.target.value }))
            }
          />
          <TextField
            label="To date"
            type="date"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={draftDates.to}
            onChange={(e) =>
              setDraftDates((prev) => ({ ...prev, to: e.target.value }))
            }
          />
        </Box>
      </CollapsibleFiltersPanel>

      {/* Summary metrics */}
      <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>
        At a glance
      </Typography>
      <Box sx={metricsGrid}>
        <Box sx={{ minWidth: 0, display: "flex" }}>
          {rev?._error ? (
            <Alert severity="warning" sx={{ width: "100%" }}>
              {rev._error}
            </Alert>
          ) : (
            <StatCard
              title="Sales (invoices in period)"
              value={money(rev?.total_revenue)}
              caption="Total value of invoices issued in the dates you picked (not the same as cash received)."
            />
          )}
        </Box>
        <Box sx={{ minWidth: 0, display: "flex" }}>
          {exp?._error ? (
            <Alert severity="warning" sx={{ width: "100%" }}>
              {exp._error}
            </Alert>
          ) : (
            <StatCard
              title="Money spent (expenses)"
              value={money(exp?.total_expense)}
              caption="Recorded clinic expenses in this period."
              color="warning"
            />
          )}
        </Box>
        <Box sx={{ minWidth: 0, display: "flex" }}>
          {prof?._error ? (
            <Alert severity="warning" sx={{ width: "100%" }}>
              {prof._error}
            </Alert>
          ) : (
            <StatCard
              title="Gross Profit (sales − expenses)"
              value={money(prof?.net_profit)}
              caption="A quick picture before deeper ledger checks."
              color={Number(prof?.net_profit) >= 0 ? "success" : "error"}
            />
          )}
        </Box>
        <Box sx={{ minWidth: 0, display: "flex" }}>
          {cf?._error ? (
            <Alert severity="warning" sx={{ width: "100%" }}>
              {cf._error}
            </Alert>
          ) : (
            <StatCard
              title="Cash movement"
              value={`${money(cf?.cash_in)} in / ${money(cf?.cash_out)} out`}
              caption="Recorded money in and out of the cashbook for the period."
              color="info"
            />
          )}
        </Box>
      </Box>

      <Box sx={dashboardGrid}>
        <Box sx={{ ...spanHalf, alignItems: "stretch" }}>
          <SectionShell
            title="Money owed to you (receivables)"
            description="Open invoices: what patients or visits still need to pay."
            sx={{ width: "100%", flex: 1 }}
          >
            {Array.isArray(ar) && ar.length === 0 ? (
              <Typography color="text.secondary">
                No open invoices right now.
              </Typography>
            ) : null}
            {ar?._error ? <Alert severity="warning">{ar._error}</Alert> : null}
            {Array.isArray(ar) && ar.length > 0 ? (
              <TableContainer sx={tableAreaSx}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice</TableCell>
                      <TableCell align="right">Still owed</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ar.slice(0, 50).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          {row.invoice_number ?? `#${row.id}`}
                        </TableCell>
                        <TableCell align="right">
                          {money(row.balance)}
                        </TableCell>
                        <TableCell>{row.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : null}
            {Array.isArray(ar) && ar.length > 50 ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                Showing first 50 rows. Export CSV for the full list.
              </Typography>
            ) : null}
          </SectionShell>
        </Box>

        <Box sx={{ ...spanHalf, alignItems: "stretch" }}>
          <SectionShell
            title="Unpaid visits"
            description="Visits still in payment status, including carryover from prior days."
            sx={{ width: "100%", flex: 1 }}
          >
            {Array.isArray(unpaidVisits) && unpaidVisits.length === 0 ? (
              <Typography color="text.secondary">
                No visits awaiting payment.
              </Typography>
            ) : null}
            {unpaidVisits?._error ? (
              <Alert severity="warning">{unpaidVisits._error}</Alert>
            ) : null}
            {Array.isArray(unpaidVisits) && unpaidVisits.length > 0 ? (
              <TableContainer sx={tableAreaSx}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Patient</TableCell>
                      <TableCell>Visit date</TableCell>
                      <TableCell>Doctor</TableCell>
                      <TableCell align="right">Balance</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {unpaidVisits.slice(0, 50).map((row) => (
                      <TableRow key={row.visit_id}>
                        <TableCell>{row.patient_name ?? "—"}</TableCell>
                        <TableCell>
                          {row.visit_time
                            ? dayjs(row.visit_time).format("DD-MM-YYYY HH:mm")
                            : "—"}
                        </TableCell>
                        <TableCell>{row.doctor_name ?? "—"}</TableCell>
                        <TableCell align="right">
                          {money(row.balance ?? row.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : null}
          </SectionShell>
        </Box>

        <Box sx={{ ...spanHalf, alignItems: "stretch" }}>
          <SectionShell
            title="Money you owe suppliers (payables)"
            description="Unpaid supplier bills tracked in accounts payable."
            sx={{ width: "100%", flex: 1 }}
          >
            {Array.isArray(ap) && ap.length === 0 ? (
              <Typography color="text.secondary">
                No open supplier payables.
              </Typography>
            ) : null}
            {ap?._error ? <Alert severity="warning">{ap._error}</Alert> : null}
            {Array.isArray(ap) && ap.length > 0 ? (
              <TableContainer sx={tableAreaSx}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Supplier</TableCell>
                      <TableCell align="right">Still to pay</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {ap.slice(0, 50).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.supplier?.name ?? "—"}</TableCell>
                        <TableCell align="right">
                          {money(row.balance)}
                        </TableCell>
                        <TableCell>{row.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : null}
          </SectionShell>
        </Box>

        <Box sx={{ ...spanHalf, alignItems: "stretch" }}>
          <SectionShell
            title="Cross-check (reconciliation)"
            description="High-level totals to spot mismatches: invoices vs payments, open balances, and whether journal lines balance."
            sx={{ width: "100%", flex: 1 }}
          >
            {recon?._error ? (
              <Alert severity="warning">{recon._error}</Alert>
            ) : null}
            {!recon?._error && recon ? (
              <>
                <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                  <Chip
                    color={recon.journal_balanced ? "success" : "warning"}
                    label={
                      recon.journal_balanced
                        ? "Books balance"
                        : "Journal needs review"
                    }
                    variant="outlined"
                  />
                </Stack>
                <KeyValueList
                  rows={[
                    {
                      label: "Total on invoices",
                      value: money(recon.invoices_total),
                      hint: "Sum of invoice totals in scope (void invoices excluded where applicable).",
                    },
                    {
                      label: "Payments recorded on invoices",
                      value: money(recon.payments_recorded_total),
                      hint: "Amount marked as paid toward invoices.",
                    },
                    {
                      label: "Still owed by customers (AR)",
                      value: money(recon.accounts_receivable_balance),
                      hint: "Open invoice balances.",
                    },
                    {
                      label: "Still owed to suppliers (AP)",
                      value: money(recon.supplier_payables_open_balance),
                      hint: "Open supplier payable balances.",
                    },
                    {
                      label: "Journal debits vs credits",
                      value: `${money(recon.journal_lines_total_debit)} / ${money(recon.journal_lines_total_credit)}`,
                      hint: "All journal lines in scope; debits should equal credits when healthy.",
                    },
                  ]}
                />
              </>
            ) : null}
          </SectionShell>
        </Box>

        <Box sx={{ ...spanHalf, alignItems: "stretch" }}>
          <SectionShell
            title="Formal books (profit & loss + balance sheet)"
            description="From posted journal entries. If you set dates above, only entries in that journal date range are included."
            sx={{ width: "100%", flex: 1 }}
          >
            {stmt?._error ? (
              <Alert severity="warning">{stmt._error}</Alert>
            ) : null}
            {!stmt?._error && stmt ? (
              <Stack spacing={2}>
                <Box>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ fontWeight: 700 }}
                  >
                    Profit & loss (ledger)
                  </Typography>
                  <KeyValueList
                    rows={[
                      {
                        label: "Revenue (income accounts)",
                        value: money(stmt.profit_and_loss?.total_revenue),
                      },
                      {
                        label: "Expenses",
                        value: money(stmt.profit_and_loss?.total_expense),
                      },
                      {
                        label: "Net result",
                        value: money(stmt.profit_and_loss?.net_profit),
                      },
                    ]}
                  />
                </Box>
                <Divider />
                <Box>
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ fontWeight: 700 }}
                  >
                    Balance sheet (ledger)
                  </Typography>
                  <KeyValueList
                    rows={[
                      {
                        label: "Assets",
                        value: money(stmt.balance_sheet?.assets),
                      },
                      {
                        label: "Liabilities",
                        value: money(stmt.balance_sheet?.liabilities),
                      },
                      {
                        label: "Equity",
                        value: money(stmt.balance_sheet?.equity),
                      },
                    ]}
                  />
                </Box>
              </Stack>
            ) : null}
          </SectionShell>
        </Box>

        <Box sx={{ ...spanHalf, alignItems: "stretch" }}>
          <SectionShell
            title="Package sessions still to deliver"
            description="Estimated value of sessions customers have paid for but not used yet."
            sx={{ width: "100%", flex: 1 }}
          >
            {pkg?._error ? (
              <Alert severity="warning">{pkg._error}</Alert>
            ) : null}
            {Array.isArray(pkg) && pkg.length === 0 ? (
              <Typography color="text.secondary">
                No package liability rows.
              </Typography>
            ) : null}
            {Array.isArray(pkg) && pkg.length > 0 ? (
              <TableContainer sx={tableAreaSx}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Patient package</TableCell>
                      <TableCell align="right">Sessions left</TableCell>
                      <TableCell align="right">Estimated value</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pkg.slice(0, 40).map((row) => (
                      <TableRow key={row.patient_package_id}>
                        <TableCell>#{row.patient_package_id}</TableCell>
                        <TableCell align="right">
                          {row.remaining_sessions}
                        </TableCell>
                        <TableCell align="right">
                          {money(row.remaining_value)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : null}
          </SectionShell>
        </Box>

        <Box sx={{ ...spanHalf, alignItems: "stretch" }}>
          <SectionShell
            title="Package refunds"
            description="Cash and card refunds issued from package credit notes."
            sx={{ width: "100%", flex: 1 }}
          >
            {pkgRefunds?._error ? (
              <Alert severity="warning">{pkgRefunds._error}</Alert>
            ) : null}
            {Array.isArray(pkgRefunds) && pkgRefunds.length === 0 ? (
              <Typography color="text.secondary">
                No refunds in this period.
              </Typography>
            ) : null}
            {Array.isArray(pkgRefunds) && pkgRefunds.length > 0 ? (
              <TableContainer sx={tableAreaSx}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>CN</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell align="right">Amount</TableCell>
                      <TableCell>Staff</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pkgRefunds.slice(0, 40).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.credit_note_number || "—"}</TableCell>
                        <TableCell>{row.method}</TableCell>
                        <TableCell align="right">{money(row.amount)}</TableCell>
                        <TableCell>{row.performed_by || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : null}
          </SectionShell>
        </Box>

        <Box sx={{ ...spanHalf, alignItems: "stretch" }}>
          <SectionShell
            title="Package trade-ins"
            description="Upgrade, downgrade, and cancel events with credit and top-up amounts."
            sx={{ width: "100%", flex: 1 }}
          >
            {pkgTradeIns?._error ? (
              <Alert severity="warning">{pkgTradeIns._error}</Alert>
            ) : null}
            {Array.isArray(pkgTradeIns) && pkgTradeIns.length === 0 ? (
              <Typography color="text.secondary">
                No trade-in events in this period.
              </Typography>
            ) : null}
            {Array.isArray(pkgTradeIns) && pkgTradeIns.length > 0 ? (
              <TableContainer sx={tableAreaSx}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell>From → To</TableCell>
                      <TableCell align="right">Credit</TableCell>
                      <TableCell align="right">Top-up</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pkgTradeIns.slice(0, 40).map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>{row.event_type}</TableCell>
                        <TableCell>
                          {row.from_package || "—"}
                          {row.to_package ? ` → ${row.to_package}` : ""}
                        </TableCell>
                        <TableCell align="right">
                          {money(row.credit_amount)}
                        </TableCell>
                        <TableCell align="right">
                          {money(row.top_up_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : null}
          </SectionShell>
        </Box>

        <Box sx={{ ...spanHalf, alignItems: "stretch" }}>
          <SectionShell
            title="Commission clawback"
            description="Reversed package commission from trade-in and cancel events."
            sx={{ width: "100%", flex: 1 }}
          >
            {clawback?._error ? (
              <Alert severity="warning">{clawback._error}</Alert>
            ) : null}
            {clawback?.rows?.length === 0 ? (
              <Typography color="text.secondary">
                No clawback entries in this period.
              </Typography>
            ) : null}
            {Array.isArray(clawback?.rows) && clawback.rows.length > 0 ? (
              <>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Total clawback: {money(clawback.total_clawback)}
                </Typography>
                <TableContainer sx={tableAreaSx}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Staff</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {clawback.rows.slice(0, 40).map((row, idx) => (
                        <TableRow key={`${row.staff_id}-${idx}`}>
                          <TableCell>{row.staff_name || "—"}</TableCell>
                          <TableCell align="right">
                            {money(row.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : null}
          </SectionShell>
        </Box>

        <Box sx={{ ...spanHalf, alignItems: "stretch" }}>
          <SectionShell
            title="Treatment profitability (completed)"
            description="Rough margin per completed treatment: list price vs product cost from usage."
            sx={{ width: "100%", flex: 1 }}
          >
            {tp?._error ? <Alert severity="warning">{tp._error}</Alert> : null}
            {Array.isArray(tp) && tp.length === 0 ? (
              <Typography color="text.secondary">
                No completed treatments in this view.
              </Typography>
            ) : null}
            {Array.isArray(tp) && tp.length > 0 ? (
              <TableContainer sx={tableAreaSx}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Treatment</TableCell>
                      <TableCell align="right">Price</TableCell>
                      <TableCell align="right">Cost</TableCell>
                      <TableCell align="right">Margin</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tp.slice(0, 40).map((row) => (
                      <TableRow key={row.treatment_id}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell align="right">
                          {money(row.revenue)}
                        </TableCell>
                        <TableCell align="right">{money(row.cost)}</TableCell>
                        <TableCell align="right">{money(row.profit)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : null}
          </SectionShell>
        </Box>

        {/* <Box sx={{ ...spanFull, minWidth: 0 }}>
          <SectionShell
            title="Download copies"
            description="CSV opens in Excel or Google Sheets. “Print / save as PDF” downloads a simple page you can print or save as PDF from your browser."
            sx={{ width: "100%" }}
          >
            <Stack divider={<Divider />}>
              {EXPORT_SLUGS.map((item) => (
                <ExportRow
                  key={item.exportType}
                  exportType={item.exportType}
                  label={item.label}
                  onCsv={(slug) => handleExport(slug, "csv")}
                  onPdf={(slug) => handleExport(slug, "html")}
                />
              ))}
            </Stack>
          </SectionShell>
        </Box> */}

        {/* <Box sx={{ ...spanFull, minWidth: 0 }}>
          <Accordion
            elevation={0}
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Technical details (for support)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1 }}
              >
                Raw API responses—only expand if someone from IT asks for it.
              </Typography>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 2,
                  borderRadius: 1,
                  bgcolor: (t) => alpha(t.palette.text.primary, 0.04),
                  fontSize: 11,
                  overflow: "auto",
                  maxHeight: 320,
                }}
              >
                {technicalPayload}
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box> */}
      </Box>
    </Box>
  );
}
