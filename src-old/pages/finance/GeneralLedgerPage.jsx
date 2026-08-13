import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import dayjs from "dayjs";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DownloadIcon from "@mui/icons-material/Download";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import PostAddOutlinedIcon from "@mui/icons-material/PostAddOutlined";
import SwapHorizOutlinedIcon from "@mui/icons-material/SwapHorizOutlined";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  IconButton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import GuidedEmptyState from "../../components/common/GuidedEmptyState";
import {
  COA_TYPE_GROUPS,
  coaTypeLabel,
  FinanceCreditCell,
  FinanceDebitCell,
  FinanceCoaAccountLabel,
  FinancePageHeader,
  FinanceGuidePanel,
  FinancePanel,
  FinancePanelHeader,
  FinancePanelTable,
  FinancePeriodToolbar,
  formatMonthLabel,
  monthRangeLabel,
  monthToDateRange,
  financeCoaCodeSx,
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
import { rolePrefixFromPathname } from "../../utils/financeSourceNavigation";

const defaultMonth = dayjs().format("YYYY-MM");

const EMPTY_STEPS = [
  {
    icon: SwapHorizOutlinedIcon,
    title: "Post journals",
    body: "Journal entries from the transactions queue or manual postings create debit and credit activity.",
  },
  {
    icon: PostAddOutlinedIcon,
    title: "Accounts gain activity",
    body: "Each posted entry updates opening, period, and closing balances for the accounts involved.",
  },
  {
    icon: MenuBookOutlinedIcon,
    title: "Expand for line detail",
    body: "Click an account row to see individual journal lines, references, and running balance for the month.",
  },
];

const GL_TAB_LABELS = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  income: "Revenue",
  expense: "Expenses",
};

const GL_TABS = [
  { value: "all", label: "All accounts" },
  ...COA_TYPE_GROUPS.map((g) => ({
    value: g.key,
    label: GL_TAB_LABELS[g.key] ?? g.label,
  })),
];

const ACCOUNT_COLUMNS = [
  { id: "code", label: "Code", width: 88 },
  { id: "name", label: "Account name" },
  { id: "opening", label: "Opening", align: "right", width: 120 },
  { id: "debit", label: "Period DR", align: "right", width: 120 },
  { id: "credit", label: "Period CR", align: "right", width: 120 },
  { id: "closing", label: "Closing", align: "right", width: 120 },
];

const LINE_COLUMNS = [
  { id: "date", label: "Date", width: 100 },
  { id: "journal", label: "Journal no." },
  { id: "reference", label: "Reference" },
  { id: "description", label: "Line memo" },
  { id: "debit", label: "Debit", align: "right", width: 110 },
  { id: "credit", label: "Credit", align: "right", width: 110 },
  { id: "balance", label: "Balance", align: "right", width: 120 },
];

function formatHumanDate(value) {
  if (!value) return "—";
  return dayjs(value).format("DD-MM-YYYY");
}

function balanceNormalHint(accountType) {
  if (accountType === "asset" || accountType === "expense") {
    return "Debit-normal";
  }
  return "Credit-normal";
}

function isZeroBalanceAccount(account) {
  const opening = Number(account.opening_balance ?? 0);
  const debit = Number(account.period_debit ?? 0);
  const credit = Number(account.period_credit ?? 0);
  const closing = Number(account.closing_balance ?? 0);

  return (
    Math.abs(opening) < 0.009 &&
    Math.abs(debit) < 0.009 &&
    Math.abs(credit) < 0.009 &&
    Math.abs(closing) < 0.009
  );
}

export default function GeneralLedgerPage() {
  const location = useLocation();
  const rolePrefix = rolePrefixFromPathname(location.pathname);
  const { pushToast } = useToastStore();
  const {
    financeToolbarSx,
    financeFilterStripSx,
    compactTableSx,
    compactFieldSx,
    journalLinesTableSx,
    financeAmountSx,
  } = useFinanceTokens();

  const [appliedMonth, setAppliedMonth] = useState(defaultMonth);
  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");
  const [showZeroBalance, setShowZeroBalance] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [expandedAccountId, setExpandedAccountId] = useState(null);
  const [linesByAccount, setLinesByAccount] = useState({});
  const [lineMetaByAccount, setLineMetaByAccount] = useState({});
  const [loadingLinesFor, setLoadingLinesFor] = useState(null);
  const [exportingFor, setExportingFor] = useState(null);

  const monthRange = useMemo(
    () => monthToDateRange(appliedMonth),
    [appliedMonth],
  );

  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true);
    try {
      const data = await listGeneralLedgerAccounts(monthRange);
      setAccounts(data?.data ?? []);
    } catch (error) {
      pushToast({
        severity: "error",
        message: resolveApiError(error, "Failed to load ledger accounts."),
      });
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  }, [monthRange, pushToast]);

  useEffect(() => {
    loadAccounts();
    setExpandedAccountId(null);
    setLinesByAccount({});
    setLineMetaByAccount({});
  }, [loadAccounts]);

  const loadLines = useCallback(
    async (accountId) => {
      if (linesByAccount[accountId]) return;
      setLoadingLinesFor(accountId);
      try {
        const data = await listGeneralLedgerLines(accountId, {
          ...monthRange,
          per_page: 500,
        });
        setLinesByAccount((prev) => ({
          ...prev,
          [accountId]: data?.data ?? [],
        }));
        setLineMetaByAccount((prev) => ({
          ...prev,
          [accountId]: data?.meta ?? null,
        }));
      } catch (error) {
        pushToast({
          severity: "error",
          message: resolveApiError(error, "Failed to load ledger lines."),
        });
      } finally {
        setLoadingLinesFor(null);
      }
    },
    [linesByAccount, monthRange, pushToast],
  );

  const toggleExpand = (accountId) => {
    if (expandedAccountId === accountId) {
      setExpandedAccountId(null);
      return;
    }
    setExpandedAccountId(accountId);
    loadLines(accountId);
  };

  const handleExport = async (accountId) => {
    setExportingFor(accountId);
    try {
      await downloadGeneralLedgerExport(accountId, monthRange);
    } catch (error) {
      pushToast({
        severity: "error",
        message: resolveApiError(error, "Export failed."),
      });
    } finally {
      setExportingFor(null);
    }
  };

  const filteredAccounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = accounts;
    if (activeTab !== "all") {
      list = list.filter((a) => a.type === activeTab);
    }
    if (!showZeroBalance) {
      list = list.filter((a) => !isZeroBalanceAccount(a));
    }
    if (q) {
      list = list.filter(
        (a) =>
          String(a.code).toLowerCase().includes(q) ||
          String(a.name).toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) =>
      String(a.code).localeCompare(String(b.code)),
    );
  }, [accounts, activeTab, query, showZeroBalance]);

  const tabStats = useMemo(() => {
    let list =
      activeTab === "all"
        ? accounts
        : accounts.filter((a) => a.type === activeTab);
    if (!showZeroBalance) {
      list = list.filter((a) => !isZeroBalanceAccount(a));
    }
    const periodDebit = list.reduce(
      (sum, a) => sum + Number(a.period_debit ?? 0),
      0,
    );
    const periodCredit = list.reduce(
      (sum, a) => sum + Number(a.period_credit ?? 0),
      0,
    );
    const closingTotal = list.reduce(
      (sum, a) => sum + Number(a.closing_balance ?? 0),
      0,
    );
    return { count: list.length, periodDebit, periodCredit, closingTotal };
  }, [accounts, activeTab, showZeroBalance]);

  const hasScopeFilters = Boolean(
    query.trim() || activeTab !== "all" || showZeroBalance,
  );
  const showGuidedEmpty =
    !loadingAccounts &&
    filteredAccounts.length === 0 &&
    !hasScopeFilters;

  const handleMonthChange = (month) => {
    setAppliedMonth(month);
  };

  return (
    <FinancePanel>
      <FinancePanelHeader>
        <FinancePageHeader
          title="General Ledger"
          subtitle="Account register by chart of accounts — expand any account to review journal activity for the period."
        />
      </FinancePanelHeader>

      <Box sx={{ px: 2, pt: 0 }}>
        <FinanceGuidePanel pageId="generalLedger" />
      </Box>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        spacing={1}
        sx={financeToolbarSx}
      >
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <Typography
            variant="subtitle2"
            fontWeight={700}
            sx={{ letterSpacing: "0.02em", color: "text.primary" }}
          >
            Ledger register
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 500 }}
          >
            {filteredAccounts.length} account
            {filteredAccounts.length === 1 ? "" : "s"}
          </Typography>
        </Stack>
        <Button
          variant="outlined"
          size="small"
          onClick={loadAccounts}
          disabled={loadingAccounts}
        >
          Refresh
        </Button>
      </Stack>

      <FinancePeriodToolbar
        embedded
        month={appliedMonth}
        onMonthChange={handleMonthChange}
        periodLabel={formatMonthLabel(appliedMonth)}
        periodSubLabel={monthRangeLabel(appliedMonth)}
        stats={[
          { label: "Accounts", value: tabStats.count },
          {
            label: "Period debits",
            value: formatKyats(tabStats.periodDebit),
            accent: "info.main",
          },
          {
            label: "Period credits",
            value: formatKyats(tabStats.periodCredit),
            accent: "success.main",
          },
          {
            label: "Net closing",
            value: formatKyats(tabStats.closingTotal),
          },
        ]}
      />

      <Box
        sx={{
          px: 2.5,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, value) => {
            setActiveTab(value);
            setExpandedAccountId(null);
          }}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 42,
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.8125rem",
              minHeight: 42,
              py: 1,
            },
          }}
        >
          {GL_TABS.map((tab) => (
            <Tab key={tab.value} value={tab.value} label={tab.label} />
          ))}
        </Tabs>
      </Box>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        useFlexGap
        flexWrap="wrap"
        alignItems={{ md: "flex-end" }}
        sx={{ ...financeFilterStripSx, py: 1.5 }}
      >
        <TextField
          size="small"
          label="Search account"
          placeholder="Code or name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ ...compactFieldSx, flex: 1, minWidth: 200 }}
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={showZeroBalance}
              onChange={(e) => {
                const next = e.target.checked;
                setShowZeroBalance(next);
                if (!next && expandedAccountId) {
                  const expanded = accounts.find(
                    (a) => a.id === expandedAccountId,
                  );
                  if (expanded && isZeroBalanceAccount(expanded)) {
                    setExpandedAccountId(null);
                  }
                }
              }}
            />
          }
          label={
            <Typography
              sx={{
                fontSize: "0.8125rem",
                fontWeight: 500,
                color: "text.secondary",
              }}
            >
              Show zero-balance accounts
            </Typography>
          }
          sx={{ ml: 0, mr: 0, flexShrink: 0 }}
        />
      </Stack>

      <FinancePanelTable>
        {showGuidedEmpty ? (
          <GuidedEmptyState
            icon={MenuBookOutlinedIcon}
            title="No ledger activity in this period"
            description="The general ledger lists accounts with balances or journal activity for the selected month. Post journal entries to see accounts and drill into lines here."
            steps={EMPTY_STEPS}
            footer={
              <>
                Post entries from{" "}
                <Typography
                  component={RouterLink}
                  to={`${rolePrefix}/finance/journal-entries`}
                  variant="body2"
                  sx={{
                    color: "primary.main",
                    fontWeight: 600,
                    textDecoration: "none",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  Financial Management → Journal Entries
                </Typography>
                .
              </>
            }
          />
        ) : (
        <Table size="small" sx={compactTableSx}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 36 }} />
              {ACCOUNT_COLUMNS.map((col) => (
                <TableCell
                  key={col.id}
                  align={col.align}
                  sx={col.width ? { width: col.width } : undefined}
                >
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loadingAccounts ? (
              <TableRow>
                <TableCell
                  colSpan={ACCOUNT_COLUMNS.length + 1}
                  align="center"
                  sx={{ py: 4 }}
                >
                  <LoadingIndicator size={80} />
                </TableCell>
              </TableRow>
            ) : null}

            {!loadingAccounts && filteredAccounts.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={ACCOUNT_COLUMNS.length + 1}
                  align="center"
                  sx={{ py: 3 }}
                >
                  <Typography
                    color="text.secondary"
                    sx={{ fontSize: "0.8125rem" }}
                  >
                    {query.trim()
                      ? "No accounts match this filter."
                      : activeTab !== "all"
                        ? "No accounts match this filter."
                        : showZeroBalance
                          ? "No accounts match this filter."
                          : "No accounts with activity or balance in this period. Enable “Show zero-balance accounts” to list inactive heads."}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : null}

            {!loadingAccounts
              ? filteredAccounts.map((account) => {
                  const isExpanded = expandedAccountId === account.id;
                  const lines = linesByAccount[account.id] ?? [];
                  const lineMeta = lineMetaByAccount[account.id];
                  const linesLoading = loadingLinesFor === account.id;

                  return (
                    <Fragment key={account.id}>
                      <TableRow
                        hover
                        onClick={() => toggleExpand(account.id)}
                        sx={{
                          cursor: "pointer",
                          "& .MuiTableCell-root": {
                            whiteSpace: "nowrap",
                            ...(isExpanded ? { borderBottom: 0 } : undefined),
                          },
                        }}
                      >
                        <TableCell sx={{ width: 36, px: 0.5 }}>
                          <IconButton
                            size="small"
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(account.id);
                            }}
                            sx={{
                              transform: isExpanded ? "rotate(90deg)" : "none",
                              transition: "transform 0.15s",
                            }}
                          >
                            <ChevronRightIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <Typography
                            component="span"
                            sx={{
                              fontSize: "0.8125rem",
                              fontWeight: 700,
                              ...financeCoaCodeSx,
                            }}
                          >
                            {account.code}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            component="span"
                            sx={{ fontSize: "0.8125rem", fontWeight: 600 }}
                          >
                            {account.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", lineHeight: 1.2 }}
                          >
                            {coaTypeLabel(account.type)} ·{" "}
                            {balanceNormalHint(account.type)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            sx={{ ...financeAmountSx, fontSize: "0.8125rem" }}
                          >
                            {formatKyats(account.opening_balance)}
                          </Typography>
                        </TableCell>
                        <FinanceDebitCell
                          value={account.period_debit}
                          sx={{ fontSize: "0.8125rem" }}
                        />
                        <FinanceCreditCell
                          value={account.period_credit}
                          sx={{ fontSize: "0.8125rem" }}
                        />
                        <TableCell align="right">
                          <Typography
                            sx={{
                              ...financeAmountSx,
                              fontSize: "0.8125rem",
                              fontWeight: 800,
                            }}
                          >
                            {formatKyats(account.closing_balance)}
                          </Typography>
                        </TableCell>
                      </TableRow>

                      {isExpanded ? (
                        <TableRow>
                          <TableCell
                            colSpan={ACCOUNT_COLUMNS.length + 1}
                            sx={{ py: 0, px: 1.5, borderBottom: 0 }}
                          >
                            <Box
                              sx={{
                                my: 0.5,
                                mb: 1,
                                p: 1.5,
                                borderRadius: 1,
                                border: "1px solid",
                                borderColor: "divider",
                                bgcolor: "background.paper",
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Stack
                                direction={{ xs: "column", sm: "row" }}
                                alignItems={{ xs: "flex-start", sm: "center" }}
                                justifyContent="space-between"
                                spacing={1}
                                sx={{ mb: 1.25 }}
                              >
                                <Box>
                                  <Typography
                                    variant="subtitle2"
                                    fontWeight={700}
                                    sx={{ fontSize: "0.8125rem" }}
                                  >
                                    <FinanceCoaAccountLabel
                                      code={account.code}
                                      name={account.name}
                                    />
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    Journal lines ·{" "}
                                    {monthRangeLabel(appliedMonth)}
                                  </Typography>
                                </Box>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={
                                    <DownloadIcon
                                      sx={{ fontSize: "1rem !important" }}
                                    />
                                  }
                                  onClick={() => handleExport(account.id)}
                                  disabled={exportingFor === account.id}
                                >
                                  {exportingFor === account.id
                                    ? "Exporting…"
                                    : "Export CSV"}
                                </Button>
                              </Stack>

                              <Table
                                size="small"
                                sx={{
                                  ...compactTableSx,
                                  ...journalLinesTableSx,
                                }}
                              >
                                <TableHead>
                                  <TableRow>
                                    {LINE_COLUMNS.map((col) => (
                                      <TableCell
                                        key={col.id}
                                        align={col.align}
                                        className={
                                          col.id === "debit"
                                            ? "journal-dr-header"
                                            : col.id === "credit"
                                              ? "journal-cr-header"
                                              : undefined
                                        }
                                        sx={
                                          col.width
                                            ? { width: col.width }
                                            : undefined
                                        }
                                      >
                                        {col.label}
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {linesLoading ? (
                                    <TableRow>
                                      <TableCell
                                        colSpan={LINE_COLUMNS.length}
                                        align="center"
                                        sx={{ py: 2 }}
                                      >
                                        <LoadingIndicator size={40} />
                                      </TableCell>
                                    </TableRow>
                                  ) : (
                                    <>
                                      <TableRow>
                                        <TableCell
                                          colSpan={LINE_COLUMNS.length - 1}
                                        >
                                          <Typography
                                            variant="body2"
                                            fontWeight={700}
                                            sx={{ fontSize: "0.8125rem" }}
                                          >
                                            Opening balance
                                          </Typography>
                                        </TableCell>
                                        <TableCell
                                          align="right"
                                          sx={{ fontWeight: 700 }}
                                        >
                                          {formatKyats(
                                            lineMeta?.opening_balance ??
                                              account.opening_balance ??
                                              0,
                                          )}
                                        </TableCell>
                                      </TableRow>
                                      {lines.length === 0 ? (
                                        <TableRow>
                                          <TableCell
                                            colSpan={LINE_COLUMNS.length}
                                            align="center"
                                            sx={{ py: 2 }}
                                          >
                                            <Typography
                                              color="text.secondary"
                                              sx={{ fontSize: "0.8125rem" }}
                                            >
                                              No journal activity in this
                                              period.
                                            </Typography>
                                          </TableCell>
                                        </TableRow>
                                      ) : (
                                        lines.map((line) => (
                                          <TableRow key={line.id} hover>
                                            <TableCell>
                                              {formatHumanDate(
                                                line.journal_date,
                                              )}
                                            </TableCell>
                                            <TableCell>
                                              <Typography
                                                sx={{
                                                  fontSize: "0.8125rem",
                                                  fontWeight: 600,
                                                }}
                                              >
                                                {line.journal_no ?? "—"}
                                              </Typography>
                                            </TableCell>
                                            <TableCell>
                                              <Typography
                                                sx={{ fontSize: "0.8125rem" }}
                                              >
                                                {line.name ?? "—"}
                                              </Typography>
                                            </TableCell>
                                            <TableCell>
                                              <Typography
                                                sx={{ fontSize: "0.8125rem" }}
                                                noWrap
                                              >
                                                {line.description ??
                                                  line.memo ??
                                                  "—"}
                                              </Typography>
                                            </TableCell>
                                            <FinanceDebitCell
                                              value={line.debit}
                                            />
                                            <FinanceCreditCell
                                              value={line.credit}
                                            />
                                            <TableCell
                                              align="right"
                                              sx={{ fontWeight: 700 }}
                                            >
                                              {formatKyats(
                                                line.running_balance,
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        ))
                                      )}
                                    </>
                                  )}
                                </TableBody>
                              </Table>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })
              : null}
          </TableBody>
        </Table>
        )}
      </FinancePanelTable>
    </FinancePanel>
  );
}
