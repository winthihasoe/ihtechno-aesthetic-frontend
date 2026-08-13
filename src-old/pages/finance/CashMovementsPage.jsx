import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import {
  Box,
  Button,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import GuidedEmptyState from "../../components/common/GuidedEmptyState";
import TableColumnFilterHeader from "../../components/common/TableColumnFilterHeader";
import useToastStore from "../../stores/toastStore";
import { formatKyats } from "../../utils/formatKyats";
import { resolveApiError } from "../../services/apiClient";
import { listCashFlowsAll } from "../../services/financeService";
import {
  FinancePageHeader,
  FinancePanel,
  FinancePanelHeader,
  FinancePanelTable,
  FinancePeriodToolbar,
  currentMonthKey,
  formatMonthLabel,
  monthRangeLabel,
  monthToDateRange,
  useFinanceTokens,
} from "../../components/finance";
import { rolePrefixFromPathname } from "../../utils/financeSourceNavigation";
import useTableColumnFilters from "../../hooks/useTableColumnFilters";

const emptyFilters = {
  type: "",
  query: "",
};

const EMPTY_STEPS = [
  {
    icon: PaymentsOutlinedIcon,
    title: "Collect or pay out cash",
    body: "Patient payments, expense payouts, and other cash events are recorded when staff complete billing or expense workflows.",
  },
  {
    icon: TrendingDownOutlinedIcon,
    title: "Movements are logged",
    body: "Each inflow and outflow is captured with source, date, and amount for the selected month.",
  },
  {
    icon: ReceiptLongOutlinedIcon,
    title: "Review and reconcile",
    body: "Use this register to reconcile physical cash against the ledger.",
  },
];

function formatHumanDateTime(value) {
  if (!value) return "—";
  return dayjs(value).format("DD-MM-YYYY HH:mm");
}

function sourceLabel(sourceType) {
  if (!sourceType) return "—";
  return sourceType.replace(/_/g, " ");
}

function isInflow(row) {
  return row.direction === "in" || row.type === "inflow";
}

function flowTypeLabel(row) {
  if (isInflow(row)) return "Inflow";
  if (row.direction === "out" || row.type === "outflow") return "Outflow";
  return "—";
}

function sourceDisplay(row) {
  const parts = [row.label, row.reference].filter(Boolean);
  if (parts.length) return parts.join(" · ");
  return sourceLabel(row.source_type);
}

const CASH_MOVEMENT_COLUMN_FILTERS = [
  { key: "source", getValue: (row) => sourceDisplay(row) },
  { key: "type", getValue: (row) => flowTypeLabel(row) },
];

export default function CashMovementsPage() {
  const location = useLocation();
  const rolePrefix = rolePrefixFromPathname(location.pathname);
  const { pushToast } = useToastStore();
  const {
    financeToolbarSx,
    financeFilterStripSx,
    compactTableSx,
    compactFieldSx,
  } = useFinanceTokens();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const {
    filteredRows,
    columnOptions,
    getColumnSelectionArray,
    setColumnSelection,
    clearColumnSelection,
    resetColumnFilters,
    hasActiveColumnFilters,
  } = useTableColumnFilters(rows, { columns: CASH_MOVEMENT_COLUMN_FILTERS });
  const [appliedMonth, setAppliedMonth] = useState(currentMonthKey);
  const [filters, setFilters] = useState(emptyFilters);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);

  const load = useCallback(
    async (nextFilters = filters, month = appliedMonth) => {
      setLoading(true);
      try {
        const params = Object.fromEntries(
          Object.entries({
            ...monthToDateRange(month),
            ...nextFilters,
          }).filter(([, value]) => String(value).trim() !== ""),
        );
        const data = await listCashFlowsAll(params);
        setRows(Array.isArray(data) ? data : []);
      } catch (error) {
        pushToast({
          message: resolveApiError(error, "Failed to load cash movements."),
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [appliedMonth, filters, pushToast],
  );

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(
    () =>
      filteredRows.reduce(
        (acc, row) => {
          const amount = Number(row.amount) || 0;
          if (isInflow(row)) acc.in += amount;
          else acc.out += amount;
          return acc;
        },
        { in: 0, out: 0 },
      ),
    [filteredRows],
  );

  const hasActiveFilters = Boolean(
    filters.type || String(filters.query ?? "").trim() || hasActiveColumnFilters,
  );
  const showGuidedEmpty =
    !loading && rows.length === 0 && !hasActiveFilters;

  const handleMonthChange = (nextMonth) => {
    resetColumnFilters();
    setAppliedMonth(nextMonth);
    load(filters, nextMonth);
  };

  const applyFilters = () => {
    resetColumnFilters();
    setFilters({ ...draftFilters });
    load(draftFilters, appliedMonth);
  };

  const clearFilters = () => {
    resetColumnFilters();
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
    load(emptyFilters, appliedMonth);
  };

  return (
    <Box sx={{ pb: 3 }}>
      <FinancePanel>
        <FinancePanelHeader>
          <FinancePageHeader
            title="Cash Movements"
            subtitle="Cash in and out register by reporting month."
          />
        </FinancePanelHeader>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          spacing={1}
          sx={financeToolbarSx}
        >
          <Typography
            variant="subtitle2"
            fontWeight={700}
            sx={{ letterSpacing: "0.02em" }}
          >
            Cash movements
          </Typography>
        </Stack>

        <FinancePeriodToolbar
          embedded
          month={appliedMonth}
          onMonthChange={handleMonthChange}
          periodLabel={formatMonthLabel(appliedMonth)}
          periodSubLabel={monthRangeLabel(appliedMonth)}
          stats={[
            {
              label: "Cash in",
              value: formatKyats(totals.in),
              accent: "success.main",
            },
            {
              label: "Cash out",
              value: formatKyats(totals.out),
              accent: "error.main",
            },
            {
              label: "Net",
              value: formatKyats(totals.in - totals.out),
              accent:
                totals.in - totals.out >= 0 ? "success.main" : "error.main",
            },
            { label: "Lines", value: filteredRows.length },
          ]}
        />

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          useFlexGap
          flexWrap="wrap"
          alignItems={{ md: "flex-end" }}
          sx={{
            ...financeFilterStripSx,
            borderTop: 0,
          }}
        >
          <TextField
            select
            size="small"
            label="Type"
            value={draftFilters.type}
            onChange={(e) =>
              setDraftFilters((f) => ({ ...f, type: e.target.value }))
            }
            sx={{ ...compactFieldSx, minWidth: 140 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="inflow">Inflow</MenuItem>
            <MenuItem value="outflow">Outflow</MenuItem>
          </TextField>
          <TextField
            size="small"
            label="Search"
            value={draftFilters.query}
            onChange={(e) =>
              setDraftFilters((f) => ({ ...f, query: e.target.value }))
            }
            sx={{ ...compactFieldSx, flex: 1, minWidth: 200 }}
          />
          <Stack direction="row" spacing={0.75}>
            <Button variant="contained" size="small" onClick={applyFilters}>
              Apply
            </Button>
            <Button variant="outlined" size="small" onClick={clearFilters}>
              Clear
            </Button>
          </Stack>
        </Stack>

        <FinancePanelTable>
          {showGuidedEmpty ? (
            <GuidedEmptyState
              icon={PaymentsOutlinedIcon}
              title="No cash movements in this period"
              description="Cash inflows and outflows appear here after payments and expenses are recorded. Pick a month above once activity starts, or change month if you expect earlier entries."
              steps={EMPTY_STEPS}
              footer={
                <>
                  Activity originates from{" "}
                  <Typography
                    component={RouterLink}
                    to={`${rolePrefix}/finance/transactions`}
                    variant="body2"
                    sx={{
                      color: "primary.main",
                      fontWeight: 600,
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    Financial Management → Transactions
                  </Typography>
                  .
                </>
              }
            />
          ) : (
          <Table size="small" sx={compactTableSx}>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableColumnFilterHeader
                  label="Source"
                  options={columnOptions.source ?? []}
                  selectedValues={getColumnSelectionArray("source")}
                  onApply={(values) => setColumnSelection("source", values)}
                  onClear={() => clearColumnSelection("source")}
                />
                <TableColumnFilterHeader
                  label="Type"
                  options={columnOptions.type ?? []}
                  selectedValues={getColumnSelectionArray("type")}
                  onApply={(values) => setColumnSelection("type", values)}
                  onClear={() => clearColumnSelection("type")}
                />
                <TableCell align="right">Amount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                    <LoadingIndicator size={80} />
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      {hasActiveFilters
                        ? "No results match your filters."
                        : "No cash movements in this period."}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>
                      {formatHumanDateTime(row.date ?? row.occurred_at)}
                    </TableCell>
                    <TableCell>{sourceDisplay(row)}</TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 600,
                        color: isInflow(row) ? "success.main" : "error.main",
                      }}
                    >
                      {flowTypeLabel(row)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        color: isInflow(row) ? "success.main" : "error.main",
                      }}
                    >
                      {formatKyats(row.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          )}
        </FinancePanelTable>
      </FinancePanel>
    </Box>
  );
}
