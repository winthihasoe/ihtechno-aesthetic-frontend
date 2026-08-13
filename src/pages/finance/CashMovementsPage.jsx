import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import DownloadIcon from "@mui/icons-material/Download";
import {
  Box,
  Button,
  CircularProgress,
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
import useToastStore from "../../stores/toastStore";
import { formatKyats } from "../../utils/formatKyats";
import { resolveApiError } from "../../services/apiClient";
import {
  downloadCashFlowsExport,
  listCashFlows,
} from "../../services/financeService";
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

const emptyFilters = {
  type: "",
  query: "",
};

function formatHumanDateTime(value) {
  if (!value) return "—";
  return dayjs(value).format("DD-MM-YYYY HH:mm");
}

function sourceLabel(sourceType) {
  if (!sourceType) return "—";
  return sourceType.replace(/_/g, " ");
}

export default function CashMovementsPage() {
  const { pushToast } = useToastStore();
  const {
    financeToolbarSx,
    financeFilterStripSx,
    compactTableSx,
    compactFieldSx,
  } = useFinanceTokens();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [appliedMonth, setAppliedMonth] = useState(currentMonthKey);
  const [filters, setFilters] = useState(emptyFilters);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);

  const monthRange = useMemo(() => monthToDateRange(appliedMonth), [appliedMonth]);

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
        const data = await listCashFlows(params);
        setRows(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
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
      rows.reduce(
        (acc, row) => {
          const amount = Number(row.amount) || 0;
          if (row.type === "inflow") acc.in += amount;
          else acc.out += amount;
          return acc;
        },
        { in: 0, out: 0 },
      ),
    [rows],
  );

  const handleMonthChange = (nextMonth) => {
    setAppliedMonth(nextMonth);
    load(filters, nextMonth);
  };

  const applyFilters = () => {
    setFilters({ ...draftFilters });
    load(draftFilters, appliedMonth);
  };

  const clearFilters = () => {
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
    load(emptyFilters, appliedMonth);
  };

  return (
    <Box sx={{ pb: 3 }}>
      <FinancePanel>
        <FinancePanelHeader>
          <FinancePageHeader
            title="Cash movements"
            subtitle="Cash in and out register by reporting month."
            guide={[
              "Actual cash inflows (collections, other income) and outflows (expenses, supplier & payroll payments).",
              "Use it to watch liquidity — how much cash the clinic is generating or burning over the period.",
            ]}
          />
        </FinancePanelHeader>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          spacing={1}
          sx={financeToolbarSx}
        >
          <Typography variant="subtitle2" fontWeight={700} sx={{ letterSpacing: "0.02em" }}>
            Cash movements
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            disabled={exporting || loading}
            onClick={async () => {
              setExporting(true);
              try {
                await downloadCashFlowsExport({
                  ...monthRange,
                  ...filters,
                });
              } catch (error) {
                pushToast({
                  message: resolveApiError(error, "Export failed."),
                  severity: "error",
                });
              } finally {
                setExporting(false);
              }
            }}
          >
            Export CSV
          </Button>
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
              accent: totals.in - totals.out >= 0 ? "success.main" : "error.main",
            },
            { label: "Lines", value: rows.length },
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
            <Table size="small" sx={compactTableSx}>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Source</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        No cash movements in this period.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{formatHumanDateTime(row.occurred_at)}</TableCell>
                      <TableCell>{sourceLabel(row.source_type)}</TableCell>
                      <TableCell
                        sx={{
                          textTransform: "capitalize",
                          fontWeight: 600,
                          color:
                            row.type === "inflow" ? "success.main" : "error.main",
                        }}
                      >
                        {row.type ?? "—"}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color:
                            row.type === "inflow" ? "success.main" : "error.main",
                        }}
                      >
                        {formatKyats(row.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
        </FinancePanelTable>
      </FinancePanel>
    </Box>
  );
}
