import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import {
  Box,
  Button,
  CircularProgress,
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
import { getProfitAndLossReport } from "../../services/financeService";
import {
  FinancePageHeader,
  FinancePanel,
  FinancePanelHeader,
  FinancePanelTable,
  useFinanceTokens,
} from "../../components/finance";

const defaultRangeStart = dayjs()
  .startOf("day")
  .subtract(30, "day")
  .format("YYYY-MM-DD");
const defaultRangeEnd = dayjs().startOf("day").format("YYYY-MM-DD");

function formatHumanDate(value) {
  if (!value) return "—";
  return dayjs(value).format("DD-MM-YYYY");
}

export default function ProfitLossPage() {
  const { pushToast } = useToastStore();
  const { financeFilterStripSx, compactFieldSx, compactTableSx } = useFinanceTokens();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [filters, setFilters] = useState({
    date_from: defaultRangeStart,
    date_to: defaultRangeEnd,
  });
  const [draftFilters, setDraftFilters] = useState(filters);

  const load = useCallback(
    async (next = filters) => {
      setLoading(true);
      try {
        const data = await getProfitAndLossReport(next);
        setReport(data);
      } catch (error) {
        pushToast({
          message: resolveApiError(error, "Failed to load profit and loss."),
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

  const incomeLines =
    report?.lines?.filter((line) => line.type === "income") ?? [];
  const expenseLines =
    report?.lines?.filter((line) => line.type === "expense") ?? [];

  return (
    <FinancePanel>
      <FinancePanelHeader>
        <FinancePageHeader
          title="Profit & Loss"
          subtitle="From posted journal entries (books)."
          guide={[
            "Revenue minus expenses for the selected period = net profit — the clinic's income statement.",
            "Figures are built from posted journal entries, so they reconcile with the ledger.",
            "Adjust the date range and Apply to compare months.",
          ]}
        />
      </FinancePanelHeader>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems="flex-end"
        flexWrap="wrap"
        useFlexGap
        sx={financeFilterStripSx}
      >
        <TextField
          label="From"
          type="date"
          size="small"
          value={draftFilters.date_from}
          onChange={(e) =>
            setDraftFilters((f) => ({ ...f, date_from: e.target.value }))
          }
          InputLabelProps={{ shrink: true }}
          sx={compactFieldSx}
        />
        <TextField
          label="To"
          type="date"
          size="small"
          value={draftFilters.date_to}
          onChange={(e) =>
            setDraftFilters((f) => ({ ...f, date_to: e.target.value }))
          }
          InputLabelProps={{ shrink: true }}
          sx={compactFieldSx}
        />
        <Button
          variant="contained"
          onClick={() => {
            setFilters(draftFilters);
            load(draftFilters);
          }}
        >
          Apply
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ width: "100%" }}>
          Period: {formatHumanDate(filters.date_from)} –{" "}
          {formatHumanDate(filters.date_to)}
        </Typography>
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={0}>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Typography sx={{ px: 2.5, pt: 2, fontWeight: 600 }}>Revenue</Typography>
            <AccountTable lines={incomeLines} compactTableSx={compactTableSx} />
            <SummaryRow
              label="Total revenue"
              amount={report?.totals?.total_revenue}
            />
          </Box>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Typography sx={{ px: 2.5, pt: 2, fontWeight: 600 }}>Expenses</Typography>
            <AccountTable lines={expenseLines} compactTableSx={compactTableSx} />
            <SummaryRow
              label="Total expenses"
              amount={report?.totals?.total_expense}
            />
          </Box>
          <Box sx={{ px: 2.5, py: 1.5 }}>
            <Typography fontWeight={700}>
              Net profit: {formatKyats(report?.totals?.net_profit ?? 0)}
            </Typography>
          </Box>
        </Stack>
      )}
    </FinancePanel>
  );
}

function AccountTable({ lines, compactTableSx }) {
  if (!lines.length) {
    return (
      <Typography color="text.secondary" sx={{ p: 2, fontSize: "0.875rem" }}>
        No activity in this period.
      </Typography>
    );
  }
  return (
    <FinancePanelTable>
      <Table size="small" sx={compactTableSx}>
        <TableHead>
          <TableRow>
            <TableCell>Code</TableCell>
            <TableCell>Account</TableCell>
            <TableCell align="right">Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line.account_id}>
              <TableCell>{line.code}</TableCell>
              <TableCell>{line.name}</TableCell>
              <TableCell align="right">{formatKyats(line.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </FinancePanelTable>
  );
}

function SummaryRow({ label, amount }) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1,
        borderTop: 1,
        borderColor: "divider",
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <Typography fontWeight={600}>{label}</Typography>
      <Typography fontWeight={600}>{formatKyats(amount ?? 0)}</Typography>
    </Box>
  );
}
