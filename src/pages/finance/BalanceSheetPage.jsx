import { Fragment, useCallback, useEffect, useState } from "react";
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
import { getBalanceSheetReport } from "../../services/financeService";
import {
  FinancePageHeader,
  FinancePanel,
  FinancePanelHeader,
  FinancePanelTable,
  getCompactTableSx,
  useFinanceTokens,
} from "../../components/finance";

function formatHumanDate(value) {
  if (!value) return "—";
  return dayjs(value).format("DD-MM-YYYY");
}

export default function BalanceSheetPage() {
  const { pushToast } = useToastStore();
  const { financeFilterStripSx, compactFieldSx, compactTableSx } = useFinanceTokens();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [asOf, setAsOf] = useState(dayjs().format("YYYY-MM-DD"));
  const [draftAsOf, setDraftAsOf] = useState(asOf);

  const load = useCallback(
    async (date = asOf) => {
      setLoading(true);
      try {
        const data = await getBalanceSheetReport({ as_of: date });
        setReport(data);
      } catch (error) {
        pushToast({
          message: resolveApiError(error, "Failed to load balance sheet."),
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    },
    [asOf, pushToast],
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <FinancePanel>
      <FinancePanelHeader>
        <FinancePageHeader
          title="Balance Sheet"
          subtitle="Account balances from posted journal entries as of a date."
          guide={[
            "A snapshot of what the clinic owns and owes on a chosen date: Assets = Liabilities + Equity.",
            "Assets include cash, receivables, inventory and equipment; equity carries the accumulated profit.",
            "The two totals at the bottom must match — that's the balance-sheet check.",
          ]}
        />
      </FinancePanelHeader>

      <Stack
        direction="row"
        spacing={2}
        alignItems="flex-end"
        flexWrap="wrap"
        useFlexGap
        sx={financeFilterStripSx}
      >
        <TextField
          label="As of"
          type="date"
          size="small"
          value={draftAsOf}
          onChange={(e) => setDraftAsOf(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={compactFieldSx}
        />
        <Button
          variant="contained"
          onClick={() => {
            setAsOf(draftAsOf);
            load(draftAsOf);
          }}
        >
          Apply
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ width: "100%" }}>
          As of {formatHumanDate(asOf)}
        </Typography>
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Stack spacing={2}>
          {(report?.sections ?? []).map((section) => (
            <Fragment key={section.label}>
              <Typography
                sx={{ color: "text.primary", px: 2, pt: 2, fontWeight: 600 }}
              >
                {section.label}
              </Typography>
              {section.lines?.length ? (
                <FinancePanelTable>
                  <Table size="small" sx={compactTableSx}>
                    <TableHead>
                      <TableRow>
                        <TableCell>Code</TableCell>
                        <TableCell>Account</TableCell>
                        <TableCell align="right">Balance</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {section.lines.map((line) => (
                        <TableRow key={line.account_id}>
                          <TableCell>{line.code}</TableCell>
                          <TableCell>{line.name}</TableCell>
                          <TableCell align="right">
                            {formatKyats(line.balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </FinancePanelTable>
              ) : (
                <Typography
                  color="text.secondary"
                  sx={{ p: 2, fontSize: "0.875rem" }}
                >
                  No balances.
                </Typography>
              )}
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
                <Typography color="text.primary" fontWeight={600}>
                  Section total
                </Typography>
                <Typography color="text.secondary" fontWeight={600}>
                  {formatKyats(section.total)}
                </Typography>
              </Box>
            </Fragment>
          ))}
          <Box
            sx={{
              px: 2.5,
              py: 1.5,
              borderTop: 1,
              borderColor: "divider",
            }}
          >
            <Typography>
              Assets: {formatKyats(report?.totals?.assets ?? 0)}
            </Typography>
            <Typography>
              Liabilities + Equity:{" "}
              {formatKyats(report?.totals?.liabilities_plus_equity ?? 0)}
            </Typography>
          </Box>
        </Stack>
      )}
    </FinancePanel>
  );
}
