import { useCallback, useEffect, useState } from "react";
import dayjs from "dayjs";
import DownloadIcon from "@mui/icons-material/Download";
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  TableCell,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  COA_TYPE_FILTER_OPTIONS,
  coaTypeLabel,
  FinanceCreditCell,
  FinanceDebitCell,
  FinanceFilterBar,
  FinanceFilterField,
  FinancePageHeader,
  FinanceTable,
  useFinanceTokens,
} from "../../components/finance";
import useToastStore from "../../stores/toastStore";
import { formatKyats } from "../../utils/formatKyats";
import { resolveApiError } from "../../services/apiClient";
import {
  downloadGeneralLedgerExport,
  listGeneralLedgerAccounts,
  listGeneralLedgerLines,
} from "../../services/financeService";

const defaultRangeStart = dayjs()
  .startOf("day")
  .subtract(6, "day")
  .format("YYYY-MM-DD");
const defaultRangeEnd = dayjs().startOf("day").format("YYYY-MM-DD");

const emptyFilters = {
  date_from: defaultRangeStart,
  date_to: defaultRangeEnd,
  type: "",
};

function formatHumanDate(value) {
  if (!value) return "—";
  return dayjs(value).format("DD-MM-YYYY");
}

function balanceLabel(accountType) {
  if (accountType === "asset" || accountType === "expense") {
    return "Debit-normal (assets & expenses)";
  }
  return "Credit-normal (liabilities, equity & income)";
}

const GL_LINE_COLUMNS = [
  { id: "date", label: "Date" },
  { id: "journal", label: "Journal" },
  { id: "name", label: "Name" },
  { id: "debit", label: "Debit", align: "right" },
  { id: "credit", label: "Credit", align: "right" },
  { id: "balance", label: "Balance", align: "right" },
];

export default function GeneralLedgerPage() {
  const { pushToast } = useToastStore();
  const { financeSurfaceSx, compactFieldSx } = useFinanceTokens();

  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [lines, setLines] = useState([]);
  const [lineMeta, setLineMeta] = useState(null);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loadingLines, setLoadingLines] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState(emptyFilters);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const loadAccounts = useCallback(
    async (nextFilters = filters) => {
      setLoadingAccounts(true);
      try {
        const params = Object.fromEntries(
          Object.entries(nextFilters).filter(
            ([, value]) => String(value).trim() !== "",
          ),
        );
        const data = await listGeneralLedgerAccounts(params);
        const list = data?.data ?? [];
        setAccounts(list);
        if (list.length > 0 && !list.some((a) => a.id === selectedAccountId)) {
          setSelectedAccountId(list[0].id);
        }
      } catch (error) {
        pushToast({
          severity: "error",
          message: resolveApiError(error, "Failed to load accounts."),
        });
      } finally {
        setLoadingAccounts(false);
      }
    },
    [filters, pushToast, selectedAccountId],
  );

  const loadLines = useCallback(
    async (accountId, nextFilters = filters) => {
      if (!accountId) return;
      setLoadingLines(true);
      try {
        const params = Object.fromEntries(
          Object.entries(nextFilters).filter(
            ([, value]) => String(value).trim() !== "",
          ),
        );
        const data = await listGeneralLedgerLines(accountId, {
          ...params,
          per_page: 500,
        });
        setLines(data?.data ?? []);
        setLineMeta(data?.meta ?? null);
      } catch (error) {
        pushToast({
          severity: "error",
          message: resolveApiError(error, "Failed to load ledger lines."),
        });
      } finally {
        setLoadingLines(false);
      }
    },
    [filters, pushToast],
  );

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  useEffect(() => {
    if (selectedAccountId) {
      loadLines(selectedAccountId);
    }
  }, [selectedAccountId, loadLines]);

  const applyFilters = () => {
    setFilters(draftFilters);
    loadAccounts(draftFilters);
    if (selectedAccountId) {
      loadLines(selectedAccountId, draftFilters);
    }
  };

  const clearFilters = () => {
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
    loadAccounts(emptyFilters);
    if (selectedAccountId) {
      loadLines(selectedAccountId, emptyFilters);
    }
  };

  const handleExport = async () => {
    if (!selectedAccountId) return;
    setExporting(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => String(value).trim() !== ""),
      );
      await downloadGeneralLedgerExport(selectedAccountId, params);
    } catch (error) {
      pushToast({
        severity: "error",
        message: resolveApiError(error, "Export failed."),
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Box sx={{ ...financeSurfaceSx, overflow: "hidden" }}>
      <Box sx={{ px: { xs: 2, sm: 2.5 }, pt: { xs: 2, sm: 2.5 }, pb: 1 }}>
      <FinancePageHeader
        title="General Ledger"
        subtitle="Account balances and journal activity by chart of accounts."
        guide={[
          "Pick an account on the left to see every journal line that hit it, with a running balance.",
          "This is the detailed audit trail behind the Profit & Loss and Balance Sheet figures.",
        ]}
        actions={
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={handleExport}
            disabled={exporting || !selectedAccountId}
          >
            Export CSV
          </Button>
        }
      />
      </Box>

      <FinanceFilterBar embedded onApply={applyFilters} onClear={clearFilters}>
        <FinanceFilterField sx={{ maxWidth: 180 }}>
          <TextField
            size="small"
            type="date"
            label="Date from"
            value={draftFilters.date_from}
            onChange={(e) =>
              setDraftFilters((prev) => ({ ...prev, date_from: e.target.value }))
            }
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
            sx={compactFieldSx}
          />
        </FinanceFilterField>
        <FinanceFilterField sx={{ maxWidth: 180 }}>
          <TextField
            size="small"
            type="date"
            label="Date to"
            value={draftFilters.date_to}
            onChange={(e) =>
              setDraftFilters((prev) => ({ ...prev, date_to: e.target.value }))
            }
            slotProps={{ inputLabel: { shrink: true } }}
            fullWidth
            sx={compactFieldSx}
          />
        </FinanceFilterField>
        <FinanceFilterField sx={{ minWidth: 160, flex: "0 1 160px" }}>
          <TextField
            size="small"
            select
            label="Account type"
            value={draftFilters.type}
            onChange={(e) =>
              setDraftFilters((prev) => ({ ...prev, type: e.target.value }))
            }
            fullWidth
            sx={compactFieldSx}
          >
            {COA_TYPE_FILTER_OPTIONS.map((item) => (
              <MenuItem key={item.value || "all"} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </TextField>
        </FinanceFilterField>
      </FinanceFilterBar>

      <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: { xs: 2, sm: 2.5 } }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
            <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
              <Typography fontWeight={700}>Accounts</Typography>
            </Box>
            {loadingAccounts ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={28} />
              </Box>
            ) : (
              <List dense disablePadding sx={{ maxHeight: 520, overflow: "auto" }}>
                {accounts.map((account) => (
                  <ListItemButton
                    key={account.id}
                    selected={account.id === selectedAccountId}
                    onClick={() => setSelectedAccountId(account.id)}
                  >
                    <ListItemText
                      primary={`${account.code} · ${account.name}`}
                      secondary={`Close ${formatKyats(account.closing_balance)}`}
                      primaryTypographyProps={{ fontWeight: 700, variant: "body2" }}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          {selectedAccount ? (
            <Stack spacing={1.5}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  justifyContent="space-between"
                >
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800}>
                      {selectedAccount.code} · {selectedAccount.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {balanceLabel(selectedAccount.type)}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, textTransform: "capitalize", opacity: 0.85 }}
                  >
                    {coaTypeLabel(selectedAccount.type)}
                  </Typography>
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mt={1.5}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Opening
                    </Typography>
                    <Typography fontWeight={700}>
                      {formatKyats(selectedAccount.opening_balance)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Period debit
                    </Typography>
                    <Typography fontWeight={700}>
                      {formatKyats(selectedAccount.period_debit)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Period credit
                    </Typography>
                    <Typography fontWeight={700}>
                      {formatKyats(selectedAccount.period_credit)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Closing
                    </Typography>
                    <Typography fontWeight={800}>
                      {formatKyats(selectedAccount.closing_balance)}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              <FinanceTable
                embedded
                columns={GL_LINE_COLUMNS}
                loading={loadingLines}
                stickyHeader
                emptyMessage="No lines in this period."
                colSpan={6}
              >
                {!loadingLines ? (
                  <>
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography variant="body2" fontWeight={700}>
                          Opening balance
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatKyats(lineMeta?.opening_balance ?? 0)}
                      </TableCell>
                    </TableRow>
                    {lines.map((line) => (
                      <TableRow key={line.id} hover>
                        <TableCell>{formatHumanDate(line.journal_date)}</TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {line.journal_no ?? "—"}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {line.description ?? line.memo ?? ""}
                          </Typography>
                        </TableCell>
                        <TableCell>{line.name ?? "—"}</TableCell>
                        <FinanceDebitCell value={line.debit} />
                        <FinanceCreditCell value={line.credit} />
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {formatKyats(line.running_balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : null}
              </FinanceTable>
            </Stack>
          ) : (
            <Paper
              variant="outlined"
              sx={{ p: 4, borderRadius: 2, textAlign: "center" }}
            >
              <Typography color="text.secondary">Select an account to view ledger lines.</Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
      </Box>
    </Box>
  );
}
