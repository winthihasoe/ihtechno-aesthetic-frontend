import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import {
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import useToastStore from "../../stores/toastStore";
import { formatKyats } from "../../utils/formatKyats";
import { resolveApiError } from "../../services/apiClient";
import {
  getProfitAndLossReport,
  listGeneralLedgerLines,
} from "../../services/financeService";
import {
  CompareMetricCells,
  FinanceCoaAccountLabel,
  FinanceCreditCell,
  FinanceDebitCell,
  FinancePageHeader,
  FinanceGuidePanel,
  FinancePanel,
  FinancePanelHeader,
  FinancePanelTable,
  FinancePeriodToolbar,
  SummaryAmountCells,
  filterReportLines,
  financeReportSummaryAmountCellSx,
  financeReportSummaryCellSx,
  financeReportTableMinWidth,
  financeReportTableSx,
  FINANCE_REPORT_COLUMN_WIDTHS,
  formatMonthLabel,
  mergeCompareLines,
  monthRangeLabel,
  monthToDateRange,
  shiftMonth,
  signedAmountColor,
  useFinanceTokens,
} from "../../components/finance";

const EXPAND_COL_WIDTH = 36;

const PL_LINE_COLUMNS = [
  { id: "date", label: "Date", width: 100 },
  { id: "journal", label: "Journal no." },
  { id: "reference", label: "Reference" },
  { id: "description", label: "Line memo" },
  { id: "debit", label: "Debit", align: "right", width: 110 },
  { id: "credit", label: "Credit", align: "right", width: 110 },
  { id: "impact", label: "P&L impact", align: "right", width: 120 },
];

function formatHumanDate(value) {
  if (!value) return "—";
  return dayjs(value).format("DD-MM-YYYY");
}

function plLineImpact(line, accountType) {
  const debit = Number(line.debit ?? 0);
  const credit = Number(line.credit ?? 0);
  if (accountType === "income") return credit - debit;
  return debit - credit;
}

const defaultMonth = dayjs().format("YYYY-MM");

export default function ProfitLossPage() {
  const { pushToast } = useToastStore();
  const {
    financeFilterStripSx,
    compactFieldSx,
    compactTableSx,
    journalLinesTableSx,
    financeAmountSx,
  } = useFinanceTokens();
  const [appliedMonth, setAppliedMonth] = useState(defaultMonth);
  const [hideZeroActivity, setHideZeroActivity] = useState(true);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareMonth, setCompareMonth] = useState(
    shiftMonth(defaultMonth, -1),
  );
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [compareReport, setCompareReport] = useState(null);
  const [expandedAccountId, setExpandedAccountId] = useState(null);
  const [linesByAccount, setLinesByAccount] = useState({});
  const [loadingLinesFor, setLoadingLinesFor] = useState(null);

  const monthRange = useMemo(
    () => monthToDateRange(appliedMonth),
    [appliedMonth],
  );
  const compareRange = useMemo(
    () => (compareEnabled ? monthToDateRange(compareMonth) : null),
    [compareEnabled, compareMonth],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setExpandedAccountId(null);
    setLinesByAccount({});
    try {
      const primary = await getProfitAndLossReport(monthRange);
      setReport(primary);

      if (compareEnabled && compareRange) {
        const compare = await getProfitAndLossReport(compareRange);
        setCompareReport(compare);
      } else {
        setCompareReport(null);
      }
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to load profit and loss."),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [compareEnabled, compareRange, monthRange, pushToast]);

  useEffect(() => {
    load();
  }, [load]);

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
      } catch (error) {
        pushToast({
          severity: "error",
          message: resolveApiError(error, "Failed to load journal lines."),
        });
      } finally {
        setLoadingLinesFor(null);
      }
    },
    [linesByAccount, monthRange, pushToast],
  );

  const toggleExpand = useCallback(
    (accountId) => {
      if (expandedAccountId === accountId) {
        setExpandedAccountId(null);
        return;
      }
      setExpandedAccountId(accountId);
      loadLines(accountId);
    },
    [expandedAccountId, loadLines],
  );

  const incomeLines = useMemo(() => {
    const primary =
      report?.lines?.filter((line) => line.type === "income") ?? [];
    const compare =
      compareReport?.lines?.filter((line) => line.type === "income") ?? [];
    const merged = compareEnabled
      ? mergeCompareLines(primary, compare, "amount")
      : primary;
    return filterReportLines(merged, hideZeroActivity, compareEnabled, "amount");
  }, [compareEnabled, compareReport, hideZeroActivity, report]);

  const expenseLines = useMemo(() => {
    const primary =
      report?.lines?.filter((line) => line.type === "expense") ?? [];
    const compare =
      compareReport?.lines?.filter((line) => line.type === "expense") ?? [];
    const merged = compareEnabled
      ? mergeCompareLines(primary, compare, "amount")
      : primary;
    return filterReportLines(merged, hideZeroActivity, compareEnabled, "amount");
  }, [compareEnabled, compareReport, hideZeroActivity, report]);

  const periodStats = [
    {
      label: "Revenue",
      value: formatKyats(report?.totals?.total_revenue ?? 0),
      accent: "success.main",
    },
    {
      label: "Expenses",
      value: formatKyats(report?.totals?.total_expense ?? 0),
      accent: "error.main",
    },
    {
      label: "Net profit",
      value: formatKyats(report?.totals?.net_profit ?? 0),
      accent:
        Number(report?.totals?.net_profit ?? 0) >= 0
          ? "success.main"
          : "error.main",
    },
  ];

  return (
    <FinancePanel>
      <FinancePanelHeader>
        <FinancePageHeader
          title="Profit & Loss"
          subtitle="From posted journal entries (books). Expand an account to see the journal lines behind each amount."
        />
      </FinancePanelHeader>

      <Box sx={{ px: 2, pt: 0 }}>
        <FinanceGuidePanel pageId="profitLoss" />
      </Box>

      <FinancePeriodToolbar
        embedded
        month={appliedMonth}
        onMonthChange={setAppliedMonth}
        periodLabel={formatMonthLabel(appliedMonth)}
        periodSubLabel={monthRangeLabel(appliedMonth)}
        stats={periodStats}
      />

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        useFlexGap
        flexWrap="wrap"
        alignItems={{ md: "center" }}
        sx={{ ...financeFilterStripSx, borderTop: 0, py: 1.5 }}
      >
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={hideZeroActivity}
              onChange={(e) => setHideZeroActivity(e.target.checked)}
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
              Hide accounts with zero activity
            </Typography>
          }
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={compareEnabled}
              onChange={(e) => setCompareEnabled(e.target.checked)}
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
              Compare to another month
            </Typography>
          }
        />
        {compareEnabled ? (
          <TextField
            type="month"
            size="small"
            label="Compare month"
            value={compareMonth}
            onChange={(e) => {
              if (e.target.value) setCompareMonth(e.target.value);
            }}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ ...compactFieldSx, width: { xs: "100%", sm: 170 } }}
          />
        ) : null}
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : (
        <FinanceReportScrollWrap compareEnabled={compareEnabled}>
          <Stack spacing={0}>
            <AccountSection
              title="Revenue"
              lines={incomeLines}
              summaryLabel="Total revenue"
              summaryAmount={report?.totals?.total_revenue}
              summaryCompareAmount={compareReport?.totals?.total_revenue}
              compareEnabled={compareEnabled}
              primaryLabel={formatMonthLabel(appliedMonth)}
              compareLabel={formatMonthLabel(compareMonth)}
              appliedMonth={appliedMonth}
              compactTableSx={compactTableSx}
              journalLinesTableSx={journalLinesTableSx}
              financeAmountSx={financeAmountSx}
              expandedAccountId={expandedAccountId}
              linesByAccount={linesByAccount}
              loadingLinesFor={loadingLinesFor}
              onToggleExpand={toggleExpand}
            />
            <AccountSection
              title="Expenses"
              lines={expenseLines}
              summaryLabel="Total expenses"
              summaryAmount={report?.totals?.total_expense}
              summaryCompareAmount={compareReport?.totals?.total_expense}
              compareEnabled={compareEnabled}
              primaryLabel={formatMonthLabel(appliedMonth)}
              compareLabel={formatMonthLabel(compareMonth)}
              appliedMonth={appliedMonth}
              compactTableSx={compactTableSx}
              journalLinesTableSx={journalLinesTableSx}
              financeAmountSx={financeAmountSx}
              expandedAccountId={expandedAccountId}
              linesByAccount={linesByAccount}
              loadingLinesFor={loadingLinesFor}
              onToggleExpand={toggleExpand}
              netProfitSummary={{
                label: "Net profit",
                amount: report?.totals?.net_profit,
                compareAmount: compareReport?.totals?.net_profit,
              }}
            />
          </Stack>
        </FinanceReportScrollWrap>
      )}
    </FinancePanel>
  );
}

function FinanceReportScrollWrap({ compareEnabled, children }) {
  return (
    <Box
      sx={{
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <Box
        sx={{
          minWidth: financeReportTableMinWidth(compareEnabled) + EXPAND_COL_WIDTH,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function AccountSection({
  title,
  lines,
  summaryLabel,
  summaryAmount,
  summaryCompareAmount,
  compareEnabled,
  primaryLabel,
  compareLabel,
  appliedMonth,
  compactTableSx,
  journalLinesTableSx,
  financeAmountSx,
  expandedAccountId,
  linesByAccount,
  loadingLinesFor,
  onToggleExpand,
  netProfitSummary = null,
}) {
  const columnCount = compareEnabled ? 7 : 4;

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Typography sx={{ p: 2, fontWeight: 600, color: "text.secondary" }}>
        {title}
      </Typography>
      <FinancePanelTable sx={{ overflowX: "visible" }}>
        <Table size="small" sx={financeReportTableSx(compactTableSx, compareEnabled)}>
          <colgroup>
            <col style={{ width: EXPAND_COL_WIDTH }} />
            <col style={{ width: FINANCE_REPORT_COLUMN_WIDTHS.code }} />
            <col style={{ width: FINANCE_REPORT_COLUMN_WIDTHS.account }} />
            <col style={{ width: FINANCE_REPORT_COLUMN_WIDTHS.amount }} />
            {compareEnabled ? (
              <>
                <col style={{ width: FINANCE_REPORT_COLUMN_WIDTHS.amount }} />
                <col style={{ width: FINANCE_REPORT_COLUMN_WIDTHS.change }} />
                <col style={{ width: FINANCE_REPORT_COLUMN_WIDTHS.pct }} />
              </>
            ) : null}
          </colgroup>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: EXPAND_COL_WIDTH, px: 0.5 }} />
              <TableCell className="fr-code-col">Code</TableCell>
              <TableCell className="fr-account-col">Account</TableCell>
              <TableCell align="right" className="fr-amount-col">
                {compareEnabled ? primaryLabel : "Amount"}
              </TableCell>
              {compareEnabled ? (
                <>
                  <TableCell align="right" className="fr-amount-col">
                    {compareLabel}
                  </TableCell>
                  <TableCell align="right" className="fr-change-col">
                    Change
                  </TableCell>
                  <TableCell align="right" className="fr-pct-col">
                    % Change
                  </TableCell>
                </>
              ) : null}
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.length ? (
              lines.map((line) => {
                const isExpanded = expandedAccountId === line.account_id;
                const journalLines = linesByAccount[line.account_id] ?? [];
                const linesLoading = loadingLinesFor === line.account_id;

                return (
                  <Fragment key={line.account_id}>
                    <TableRow
                      hover
                      onClick={() => onToggleExpand(line.account_id)}
                      sx={{
                        cursor: "pointer",
                        "& .MuiTableCell-root": {
                          ...(isExpanded ? { borderBottom: 0 } : undefined),
                        },
                      }}
                    >
                      <TableCell sx={{ width: EXPAND_COL_WIDTH, px: 0.5 }}>
                        <IconButton
                          size="small"
                          aria-label={isExpanded ? "Collapse" : "Expand"}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleExpand(line.account_id);
                          }}
                          sx={{
                            transform: isExpanded ? "rotate(90deg)" : "none",
                            transition: "transform 0.15s",
                          }}
                        >
                          <ChevronRightIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                      <TableCell className="fr-code-col">{line.code}</TableCell>
                      <TableCell className="fr-account-col">{line.name}</TableCell>
                      <TableCell align="right" className="fr-amount-col">
                        {formatKyats(line.amount)}
                      </TableCell>
                      {compareEnabled ? (
                        <>
                          <TableCell align="right" className="fr-amount-col">
                            {formatKyats(line.compareAmount ?? 0)}
                          </TableCell>
                          <CompareMetricCells
                            current={line.amount}
                            compare={line.compareAmount}
                          />
                        </>
                      ) : null}
                    </TableRow>

                    {isExpanded ? (
                      <TableRow>
                        <TableCell
                          colSpan={columnCount}
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
                            <Typography
                              variant="subtitle2"
                              fontWeight={700}
                              sx={{ fontSize: "0.8125rem", mb: 1.25 }}
                            >
                              <FinanceCoaAccountLabel
                                code={line.code}
                                name={line.name}
                              />
                              <Typography
                                component="span"
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: "block", fontWeight: 500, mt: 0.25 }}
                              >
                                Journal lines · {monthRangeLabel(appliedMonth)}
                              </Typography>
                            </Typography>

                            <Table
                              size="small"
                              sx={{
                                ...compactTableSx,
                                ...journalLinesTableSx,
                              }}
                            >
                              <TableHead>
                                <TableRow>
                                  {PL_LINE_COLUMNS.map((col) => (
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
                                        col.width ? { width: col.width } : undefined
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
                                      colSpan={PL_LINE_COLUMNS.length}
                                      align="center"
                                      sx={{ py: 2 }}
                                    >
                                      <LoadingIndicator size={40} />
                                    </TableCell>
                                  </TableRow>
                                ) : journalLines.length === 0 ? (
                                  <TableRow>
                                    <TableCell
                                      colSpan={PL_LINE_COLUMNS.length}
                                      align="center"
                                      sx={{ py: 2 }}
                                    >
                                      <Typography
                                        color="text.secondary"
                                        sx={{ fontSize: "0.8125rem" }}
                                      >
                                        No journal activity in this period.
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                ) : (
                                  <>
                                    {journalLines.map((journalLine) => {
                                      const impact = plLineImpact(
                                        journalLine,
                                        line.type,
                                      );
                                      return (
                                        <TableRow key={journalLine.id} hover>
                                          <TableCell>
                                            {formatHumanDate(journalLine.journal_date)}
                                          </TableCell>
                                          <TableCell>
                                            <Typography
                                              sx={{
                                                fontSize: "0.8125rem",
                                                fontWeight: 600,
                                              }}
                                            >
                                              {journalLine.journal_no ?? "—"}
                                            </Typography>
                                          </TableCell>
                                          <TableCell>
                                            <Typography sx={{ fontSize: "0.8125rem" }}>
                                              {journalLine.name ?? "—"}
                                            </Typography>
                                          </TableCell>
                                          <TableCell>
                                            <Typography
                                              sx={{ fontSize: "0.8125rem" }}
                                              noWrap
                                            >
                                              {journalLine.description ??
                                                journalLine.memo ??
                                                "—"}
                                            </Typography>
                                          </TableCell>
                                          <FinanceDebitCell value={journalLine.debit} />
                                          <FinanceCreditCell value={journalLine.credit} />
                                          <TableCell
                                            align="right"
                                            sx={{
                                              ...financeAmountSx,
                                              fontWeight: 700,
                                              color: signedAmountColor(impact),
                                            }}
                                          >
                                            {formatKyats(impact)}
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                    <TableRow>
                                      <TableCell
                                        colSpan={PL_LINE_COLUMNS.length - 1}
                                        sx={{ fontWeight: 700, borderTop: 1 }}
                                      >
                                        Period total
                                      </TableCell>
                                      <TableCell
                                        align="right"
                                        sx={{
                                          ...financeAmountSx,
                                          fontWeight: 700,
                                          borderTop: 1,
                                          color: signedAmountColor(line.amount),
                                        }}
                                      >
                                        {formatKyats(line.amount)}
                                      </TableCell>
                                    </TableRow>
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
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  sx={{ color: "text.secondary", fontSize: "0.875rem" }}
                >
                  No activity in this period.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={3} sx={financeReportSummaryCellSx}>
                {summaryLabel}
              </TableCell>
              <SummaryAmountCells
                amount={summaryAmount}
                compareAmount={summaryCompareAmount}
                compareEnabled={compareEnabled}
                sx={financeReportSummaryCellSx}
                primaryAmountSx={financeReportSummaryAmountCellSx(summaryAmount)}
                compareAmountSx={financeReportSummaryAmountCellSx(
                  summaryCompareAmount,
                )}
              />
            </TableRow>
            {netProfitSummary ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  sx={{
                    ...financeReportSummaryCellSx,
                    fontWeight: 700,
                    borderTop: 0,
                  }}
                >
                  {netProfitSummary.label}
                </TableCell>
                <SummaryAmountCells
                  amount={netProfitSummary.amount}
                  compareAmount={netProfitSummary.compareAmount}
                  compareEnabled={compareEnabled}
                  sx={{ ...financeReportSummaryCellSx, fontWeight: 700, borderTop: 0 }}
                  primaryAmountSx={{
                    ...financeReportSummaryCellSx,
                    fontWeight: 700,
                    borderTop: 0,
                    color: signedAmountColor(netProfitSummary.amount),
                  }}
                  compareAmountSx={{
                    ...financeReportSummaryCellSx,
                    fontWeight: 700,
                    borderTop: 0,
                    color: signedAmountColor(netProfitSummary.compareAmount),
                  }}
                />
              </TableRow>
            ) : null}
          </TableFooter>
        </Table>
      </FinancePanelTable>
    </Box>
  );
}
