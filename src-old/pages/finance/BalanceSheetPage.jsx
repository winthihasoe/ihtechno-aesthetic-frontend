import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import {
  Box,
  Button,
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
  Tooltip,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import useToastStore from "../../stores/toastStore";
import { formatKyats } from "../../utils/formatKyats";
import {
  buildBalanceSheetPresentation,
  lineLineKey,
} from "../../utils/balanceSheetPresentation";
import { resolveApiError } from "../../services/apiClient";
import { getBalanceSheetReport } from "../../services/financeService";
import {
  FinancePageHeader,
  FinanceGuidePanel,
  FinancePanel,
  FinancePanelHeader,
  FinancePanelTable,
  financeCoaCodeSx,
  financeReportSummaryCellSx,
  formatSignedKyats,
  useFinanceTokens,
} from "../../components/finance";

const COLUMN_WIDTHS = {
  code: 68,
  account: 180,
  amount: 120,
};

function formatHumanDate(value) {
  if (!value) return "—";
  return dayjs(value).format("DD-MM-YYYY");
}

function balanceStatusLabel(totals) {
  if (totals?.is_balanced) {
    return { label: "Balanced", color: "success.main" };
  }

  const diff = Number(totals?.difference ?? 0);
  return {
    label: `Out of balance by ${formatSignedKyats(diff)}`,
    color: "error.main",
  };
}

function balanceSheetTableSx(compactTableSx) {
  const minWidth =
    COLUMN_WIDTHS.code + COLUMN_WIDTHS.account + COLUMN_WIDTHS.amount;

  return {
    ...compactTableSx,
    tableLayout: "fixed",
    width: "100%",
    minWidth,
    "& .MuiTableCell-root": {
      fontVariantNumeric: "tabular-nums",
    },
    "& .bs-code-col": {
      whiteSpace: "nowrap",
      fontFamily: "monospace",
    },
    "& .bs-account-col": {
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    "& .bs-amount-col": {
      whiteSpace: "nowrap",
    },
  };
}

function formatBalanceAmount(amount, { isContra = false } = {}) {
  const value = Number(amount) || 0;
  if (isContra && value > 0) {
    return `(${formatKyats(value)})`;
  }

  return formatKyats(value);
}

export default function BalanceSheetPage() {
  const { pushToast } = useToastStore();
  const { financeFilterStripSx, compactFieldSx, compactTableSx } = useFinanceTokens();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [asOf, setAsOf] = useState(dayjs().format("YYYY-MM-DD"));
  const [draftAsOf, setDraftAsOf] = useState(asOf);
  const [sideBySide, setSideBySide] = useState(true);
  const [hideZeroBalances, setHideZeroBalances] = useState(true);
  const [expandedKeys, setExpandedKeys] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBalanceSheetReport({ as_of: asOf });
      setReport(data);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to load balance sheet."),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [asOf, pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const presentation = useMemo(
    () => buildBalanceSheetPresentation(report, hideZeroBalances),
    [hideZeroBalances, report],
  );

  const status = balanceStatusLabel(report?.totals);
  const tableSx = balanceSheetTableSx(compactTableSx);

  const toggleExpanded = (key) => {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <FinancePanel>
      <FinancePanelHeader>
        <FinancePageHeader
          title="Balance Sheet"
          subtitle="Account balances from posted journal entries as of a date."
        />
      </FinancePanelHeader>

      <Box sx={{ px: 2, pt: 0 }}>
        <FinanceGuidePanel pageId="balanceSheet" />
      </Box>

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
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={sideBySide}
              onChange={(e) => setSideBySide(e.target.checked)}
            />
          }
          label={
            <Typography sx={{ fontSize: "0.8125rem", fontWeight: 500, color: "text.secondary" }}>
              Compare side by side
            </Typography>
          }
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={hideZeroBalances}
              onChange={(e) => setHideZeroBalances(e.target.checked)}
            />
          }
          label={
            <Typography sx={{ fontSize: "0.8125rem", fontWeight: 500, color: "text.secondary" }}>
              Hide accounts with zero balance
            </Typography>
          }
        />
        <Button variant="contained" onClick={() => setAsOf(draftAsOf)}>
          Apply
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ width: "100%" }}>
          As of {formatHumanDate(asOf)}
        </Typography>
      </Stack>

      {!loading ? (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          useFlexGap
          flexWrap="wrap"
          sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}
        >
          <SummaryStat label="Total assets" value={formatKyats(report?.totals?.assets ?? 0)} />
          <SummaryStat
            label="Total liabilities + equity"
            value={formatKyats(report?.totals?.liabilities_plus_equity ?? 0)}
          />
          <SummaryStat label="Balance check" value={status.label} color={status.color} />
        </Stack>
      ) : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : sideBySide ? (
        <HorizontalBalanceSheet
          presentation={presentation}
          totals={report?.totals}
          status={status}
          tableSx={tableSx}
          expandedKeys={expandedKeys}
          onToggleExpanded={toggleExpanded}
        />
      ) : (
        <VerticalBalanceSheet
          presentation={presentation}
          report={report}
          status={status}
          tableSx={tableSx}
          expandedKeys={expandedKeys}
          onToggleExpanded={toggleExpanded}
        />
      )}
    </FinancePanel>
  );
}

function SummaryStat({ label, value, color = "text.primary" }) {
  return (
    <Box sx={{ minWidth: 120 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 600, color }}>{value}</Typography>
    </Box>
  );
}

function HorizontalBalanceSheet({
  presentation,
  totals,
  status,
  tableSx,
  expandedKeys,
  onToggleExpanded,
}) {
  return (
    <Box sx={{ pb: 2 }}>
      <Stack
        direction={{ xs: "column", lg: "row" }}
        spacing={0}
        alignItems="stretch"
        divider={
          <Box
            sx={{
              display: { xs: "none", lg: "block" },
              width: "1px",
              bgcolor: "divider",
              alignSelf: "stretch",
            }}
          />
        }
      >
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <ColumnHeader title="Assets" />
          <AssetsTable
            assets={presentation.assets}
            tableSx={tableSx}
            expandedKeys={expandedKeys}
            onToggleExpanded={onToggleExpanded}
          />
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <ColumnHeader title="Liabilities & Equity" />
          <LiabilitiesEquityTable
            liabilities={presentation.liabilities}
            equity={presentation.equity}
            tableSx={tableSx}
            expandedKeys={expandedKeys}
            onToggleExpanded={onToggleExpanded}
          />
        </Box>
      </Stack>

      <BalanceFooter totals={totals} status={status} />
    </Box>
  );
}

function VerticalBalanceSheet({
  presentation,
  report,
  status,
  tableSx,
  expandedKeys,
  onToggleExpanded,
}) {
  return (
    <Stack spacing={0} sx={{ pb: 2 }}>
      <SectionBlock title={presentation.assets.label}>
        <AssetsTable
          assets={presentation.assets}
          tableSx={tableSx}
          expandedKeys={expandedKeys}
          onToggleExpanded={onToggleExpanded}
        />
      </SectionBlock>

      <SectionBlock title={presentation.liabilities.label}>
        <LiabilitiesEquityTable
          liabilities={presentation.liabilities}
          equity={null}
          tableSx={tableSx}
          expandedKeys={expandedKeys}
          onToggleExpanded={onToggleExpanded}
        />
      </SectionBlock>

      <SectionBlock title={presentation.equity.label}>
        <EquityTable
          equity={presentation.equity}
          tableSx={tableSx}
          expandedKeys={expandedKeys}
          onToggleExpanded={onToggleExpanded}
        />
      </SectionBlock>

      <BalanceEquationBlock report={report} status={status} tableSx={tableSx} />
    </Stack>
  );
}

function SectionBlock({ title, children }) {
  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
      <Typography sx={{ px: 2, py: 1.25, fontWeight: 600, color: "text.secondary" }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function ColumnHeader({ title }) {
  return (
    <Typography
      sx={{
        px: 2,
        py: 1.25,
        minHeight: 44,
        display: "flex",
        alignItems: "center",
        fontWeight: 700,
        fontSize: "0.9375rem",
        color: "text.primary",
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "action.hover",
        flexShrink: 0,
      }}
    >
      {title}
    </Typography>
  );
}

function BalanceSheetTableHead() {
  return (
    <TableHead>
      <TableRow>
        <TableCell className="bs-code-col">Code</TableCell>
        <TableCell className="bs-account-col">Account</TableCell>
        <TableCell align="right" className="bs-amount-col">
          Balance
        </TableCell>
      </TableRow>
    </TableHead>
  );
}

function BalanceSheetColgroup() {
  return (
    <colgroup>
      <col style={{ width: COLUMN_WIDTHS.code }} />
      <col style={{ width: COLUMN_WIDTHS.account }} />
      <col style={{ width: COLUMN_WIDTHS.amount }} />
    </colgroup>
  );
}

function GroupHeaderRow({ label, indent = 0 }) {
  return (
    <TableRow>
      <TableCell
        colSpan={3}
        sx={{
          py: 0.75,
          pl: 2 + indent,
          fontWeight: 700,
          fontSize: "0.8125rem",
          color: "text.primary",
          bgcolor: "action.hover",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        {label}
      </TableCell>
    </TableRow>
  );
}

function SummaryRow({ label, amount, indent = 0, isContra = false, bold = true }) {
  return (
    <TableRow>
      <TableCell
        colSpan={2}
        sx={{
          ...(bold ? financeReportSummaryCellSx : {}),
          borderTop: bold ? undefined : 0,
          pl: 2 + indent,
          fontWeight: bold ? 700 : 600,
        }}
      >
        {label}
      </TableCell>
      <TableCell
        align="right"
        className="bs-amount-col"
        sx={{
          ...(bold ? financeReportSummaryCellSx : {}),
          borderTop: bold ? undefined : 0,
          fontWeight: bold ? 700 : 600,
          color: isContra ? "text.secondary" : undefined,
        }}
      >
        {formatBalanceAmount(amount, { isContra })}
      </TableCell>
    </TableRow>
  );
}

function AccountLineRow({ line, indent = 0, isContra = false }) {
  const amount = isContra
    ? Math.abs(Number(line.balance) || 0)
    : line.balance;
  const accountName = line.name || "—";

  return (
    <TableRow>
      <TableCell className="bs-code-col" sx={{ ...financeCoaCodeSx, pl: 1 + indent }}>
        {line.code || "—"}
      </TableCell>
      <TableCell className="bs-account-col" sx={{ pl: 2 + indent }}>
        <Tooltip title={accountName} placement="top-start">
          <Typography
            component="span"
            noWrap
            sx={{
              display: "block",
              fontSize: "inherit",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {accountName}
          </Typography>
        </Tooltip>
      </TableCell>
      <TableCell align="right" className="bs-amount-col">
        {formatBalanceAmount(amount, { isContra })}
      </TableCell>
    </TableRow>
  );
}

function ExpandableSubsection({
  sectionKey,
  subsection,
  expandedKeys,
  onToggleExpanded,
  indent = 1,
  isContra = false,
}) {
  if (subsection.hidden) {
    return null;
  }

  const expandable = subsection.expandable && subsection.lines?.length > 0;
  const expanded = expandable ? Boolean(expandedKeys[sectionKey]) : true;

  return (
    <Fragment>
      <TableRow
        hover={expandable}
        onClick={expandable ? () => onToggleExpanded(sectionKey) : undefined}
        sx={expandable ? { cursor: "pointer" } : undefined}
      >
        <TableCell className="bs-code-col" sx={{ pl: 1 + indent }}>
          {expandable ? (
            <IconButton
              size="small"
              aria-label={expanded ? "Collapse" : "Expand"}
              onClick={(event) => {
                event.stopPropagation();
                onToggleExpanded(sectionKey);
              }}
              sx={{
                transform: expanded ? "rotate(90deg)" : "none",
                transition: "transform 0.15s",
              }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          ) : null}
        </TableCell>
        <TableCell className="bs-account-col" sx={{ pl: 1 + indent, fontWeight: 600 }}>
          {subsection.label}
        </TableCell>
        <TableCell align="right" className="bs-amount-col" sx={{ fontWeight: 600 }}>
          {formatBalanceAmount(subsection.total, { isContra })}
        </TableCell>
      </TableRow>
      {expandable && expanded
        ? subsection.lines.map((line) => (
            <AccountLineRow
              key={lineLineKey(line)}
              line={line}
              indent={indent + 2}
              isContra={isContra}
            />
          ))
        : null}
    </Fragment>
  );
}

function AssetsTable({ assets, tableSx, expandedKeys, onToggleExpanded }) {
  const { currentAssets, fixedAssets } = assets;

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
      <FinancePanelTable sx={{ overflowX: "auto" }}>
        <Table size="small" sx={tableSx}>
          <BalanceSheetColgroup />
          <BalanceSheetTableHead />
          <TableBody>
            {!currentAssets.hidden ? (
              <>
                <GroupHeaderRow label={currentAssets.label} />
                <ExpandableSubsection
                  sectionKey="current-cash"
                  subsection={currentAssets.cash}
                  expandedKeys={expandedKeys}
                  onToggleExpanded={onToggleExpanded}
                  indent={1}
                />
                <ExpandableSubsection
                  sectionKey="current-ar"
                  subsection={currentAssets.accountsReceivable}
                  expandedKeys={expandedKeys}
                  onToggleExpanded={onToggleExpanded}
                  indent={1}
                />
                <ExpandableSubsection
                  sectionKey="current-other"
                  subsection={currentAssets.otherCurrent}
                  expandedKeys={expandedKeys}
                  onToggleExpanded={onToggleExpanded}
                  indent={1}
                />
                <SummaryRow
                  label="Total current assets"
                  amount={currentAssets.total}
                  indent={1}
                />
              </>
            ) : null}

            {!fixedAssets.hidden ? (
              <>
                <GroupHeaderRow label={fixedAssets.label} />
                <ExpandableSubsection
                  sectionKey="fixed-ppe"
                  subsection={fixedAssets.ppe}
                  expandedKeys={expandedKeys}
                  onToggleExpanded={onToggleExpanded}
                  indent={1}
                />
                <ExpandableSubsection
                  sectionKey="fixed-accum-dep"
                  subsection={fixedAssets.accumDep}
                  expandedKeys={expandedKeys}
                  onToggleExpanded={onToggleExpanded}
                  indent={1}
                  isContra
                />
                {!fixedAssets.netFixed.hidden ? (
                  <SummaryRow
                    label={fixedAssets.netFixed.label}
                    amount={fixedAssets.netFixed.total}
                    indent={1}
                  />
                ) : null}
              </>
            ) : null}
          </TableBody>
          <TableFooter>
            <SummaryRow label="Total assets" amount={assets.total} />
          </TableFooter>
        </Table>
      </FinancePanelTable>
    </Box>
  );
}

function LiabilitiesEquityTable({
  liabilities,
  equity,
  tableSx,
  expandedKeys,
  onToggleExpanded,
}) {
  const showEquity = equity != null;

  return (
    <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
      <FinancePanelTable sx={{ overflowX: "auto" }}>
        <Table size="small" sx={tableSx}>
          <BalanceSheetColgroup />
          <BalanceSheetTableHead />
          <TableBody>
            <GroupHeaderRow label={liabilities.label} />
            {liabilities.groups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                  No liability balances.
                </TableCell>
              </TableRow>
            ) : (
              liabilities.groups.map((group) => (
                <ExpandableSubsection
                  key={group.memo}
                  sectionKey={`liability-${group.memo}`}
                  subsection={group}
                  expandedKeys={expandedKeys}
                  onToggleExpanded={onToggleExpanded}
                  indent={1}
                />
              ))
            )}

            {showEquity ? (
              <>
                <GroupHeaderRow label={equity.label} />
                <EquityTableBody
                  equity={equity}
                  expandedKeys={expandedKeys}
                  onToggleExpanded={onToggleExpanded}
                />
              </>
            ) : null}
          </TableBody>
          {showEquity ? (
            <TableFooter>
              <SummaryRow label="Total liabilities" amount={liabilities.total} />
              <SummaryRow label="Total equity" amount={equity.total} />
            </TableFooter>
          ) : (
            <TableFooter>
              <SummaryRow label="Total liabilities" amount={liabilities.total} />
            </TableFooter>
          )}
        </Table>
      </FinancePanelTable>
    </Box>
  );
}

function EquityTable({ equity, tableSx, expandedKeys, onToggleExpanded }) {
  return (
    <FinancePanelTable sx={{ overflowX: "auto" }}>
      <Table size="small" sx={tableSx}>
        <BalanceSheetColgroup />
        <BalanceSheetTableHead />
        <TableBody>
          <EquityTableBody
            equity={equity}
            expandedKeys={expandedKeys}
            onToggleExpanded={onToggleExpanded}
          />
        </TableBody>
        <TableFooter>
          <SummaryRow label="Total equity" amount={equity.total} />
        </TableFooter>
      </Table>
    </FinancePanelTable>
  );
}

function EquityTableBody({ equity, expandedKeys, onToggleExpanded }) {
  return (
    <>
      <ExpandableSubsection
        sectionKey="equity-accounts"
        subsection={equity.equityAccounts}
        expandedKeys={expandedKeys}
        onToggleExpanded={onToggleExpanded}
        indent={1}
      />
      <ExpandableSubsection
        sectionKey="equity-retained-earnings"
        subsection={equity.retainedEarnings}
        expandedKeys={expandedKeys}
        onToggleExpanded={onToggleExpanded}
        indent={1}
      />
    </>
  );
}

function BalanceFooter({ totals, status }) {
  return (
    <Box sx={{ borderTop: 1, borderColor: "divider", px: 2, py: 2 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        divider={
          <Box
            sx={{
              display: { xs: "none", md: "block" },
              width: "1px",
              bgcolor: "divider",
              alignSelf: "stretch",
            }}
          />
        }
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Total assets
          </Typography>
          <Typography sx={{ fontWeight: 700, fontSize: "1.0625rem" }}>
            {formatKyats(totals?.assets ?? 0)}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Total liabilities + equity
          </Typography>
          <Typography sx={{ fontWeight: 700, fontSize: "1.0625rem" }}>
            {formatKyats(totals?.liabilities_plus_equity ?? 0)}
          </Typography>
        </Box>
      </Stack>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        useFlexGap
        flexWrap="wrap"
        sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: "divider" }}
      >
        <Typography sx={{ fontWeight: 600, color: status.color }}>
          {status.label}
        </Typography>
        <Typography sx={{ fontWeight: 600, color: "text.secondary" }}>
          Difference:{" "}
          <Box
            component="span"
            sx={{
              color:
                Math.abs(Number(totals?.difference ?? 0)) < 0.009
                  ? "success.main"
                  : "error.main",
            }}
          >
            {formatKyats(totals?.difference ?? 0)}
          </Box>
        </Typography>
      </Stack>
    </Box>
  );
}

function BalanceEquationBlock({ report, status, tableSx }) {
  const rows = [
    { label: "Total assets", amount: report?.totals?.assets },
    { label: "Total liabilities", amount: report?.totals?.liabilities },
    { label: "Total equity", amount: report?.totals?.equity },
    {
      label: "Total liabilities + equity",
      amount: report?.totals?.liabilities_plus_equity,
      bold: true,
    },
    {
      label: "Difference (should be 0)",
      amount: report?.totals?.difference,
      bold: true,
      valueColor: (value) =>
        Math.abs(Number(value ?? 0)) < 0.009 ? "success.main" : "error.main",
    },
  ];

  return (
    <Box sx={{ px: 0 }}>
      <Typography sx={{ px: 2, pt: 1.5, pb: 0.75, fontWeight: 600, color: "text.secondary" }}>
        Accounting equation
      </Typography>
      <FinancePanelTable sx={{ overflowX: "auto" }}>
        <Table size="small" sx={tableSx}>
          <colgroup>
            <col style={{ width: COLUMN_WIDTHS.code + COLUMN_WIDTHS.account }} />
            <col style={{ width: COLUMN_WIDTHS.amount }} />
          </colgroup>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label}>
                <TableCell sx={{ fontWeight: row.bold ? 700 : 600 }}>{row.label}</TableCell>
                <TableCell
                  align="right"
                  className="bs-amount-col"
                  sx={{
                    fontWeight: row.bold ? 700 : 600,
                    color: row.valueColor ? row.valueColor(row.amount) : "text.primary",
                  }}
                >
                  {formatKyats(row.amount ?? 0)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell
                align="right"
                className="bs-amount-col"
                sx={{ fontWeight: 600, color: status.color }}
              >
                {status.label}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </FinancePanelTable>
    </Box>
  );
}
