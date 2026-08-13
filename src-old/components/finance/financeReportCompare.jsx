import { TableCell } from "@mui/material";
import { formatKyats } from "../../utils/formatKyats";

export const FINANCE_REPORT_COLUMN_WIDTHS = {
  code: 72,
  account: 220,
  amount: 132,
  change: 132,
  pct: 96,
};

export function financeReportTableMinWidth(compareEnabled) {
  if (!compareEnabled) {
    return (
      FINANCE_REPORT_COLUMN_WIDTHS.code +
      FINANCE_REPORT_COLUMN_WIDTHS.account +
      FINANCE_REPORT_COLUMN_WIDTHS.amount
    );
  }

  return (
    FINANCE_REPORT_COLUMN_WIDTHS.code +
    FINANCE_REPORT_COLUMN_WIDTHS.account +
    FINANCE_REPORT_COLUMN_WIDTHS.amount * 2 +
    FINANCE_REPORT_COLUMN_WIDTHS.change +
    FINANCE_REPORT_COLUMN_WIDTHS.pct
  );
}

export function isZeroAmount(value) {
  return Math.abs(Number(value ?? 0)) < 0.009;
}

export function mergeCompareLines(primaryLines, compareLines, amountKey = "amount") {
  const compareKey = amountKey === "amount" ? "compareAmount" : "compareBalance";
  const byAccountId = new Map();

  for (const line of primaryLines) {
    byAccountId.set(line.account_id, {
      ...line,
      [compareKey]: 0,
    });
  }

  for (const line of compareLines) {
    const existing = byAccountId.get(line.account_id);
    if (existing) {
      existing[compareKey] = line[amountKey];
    } else {
      byAccountId.set(line.account_id, {
        ...line,
        [amountKey]: 0,
        [compareKey]: line[amountKey],
      });
    }
  }

  return Array.from(byAccountId.values()).sort((a, b) =>
    String(a.code).localeCompare(String(b.code)),
  );
}

export function filterReportLines(lines, hideZeroActivity, compareEnabled, amountKey = "amount") {
  const compareKey = amountKey === "amount" ? "compareAmount" : "compareBalance";

  if (!hideZeroActivity) return lines;

  return lines.filter((line) => {
    if (compareEnabled) {
      return !isZeroAmount(line[amountKey]) || !isZeroAmount(line[compareKey]);
    }
    return !isZeroAmount(line[amountKey]);
  });
}

export function amountChange(current, compare) {
  return Number(current ?? 0) - Number(compare ?? 0);
}

export function formatPercentChange(current, compare) {
  const base = Number(compare ?? 0);
  const change = amountChange(current, compare);

  if (Math.abs(base) < 0.009) {
    if (Math.abs(change) < 0.009) return "0.0%";
    return "—";
  }

  const pct = (change / Math.abs(base)) * 100;
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function formatSignedKyats(value) {
  const amount = Number(value ?? 0);
  if (Math.abs(amount) < 0.009) return formatKyats(0);
  const prefix = amount > 0 ? "+" : "";
  return `${prefix}${formatKyats(amount)}`;
}

export function signedAmountColor(value) {
  const amount = Number(value ?? 0);
  if (amount < 0) return "error.main";
  if (amount > 0) return "success.main";
  return "text.secondary";
}

export function financeReportTableSx(compactTableSx, compareEnabled) {
  return {
    ...compactTableSx,
    tableLayout: "fixed",
    width: "100%",
    minWidth: financeReportTableMinWidth(compareEnabled),
    "& .MuiTableCell-root": {
      fontVariantNumeric: "tabular-nums",
    },
    "& .fr-code-col": {
      whiteSpace: "nowrap",
      fontFamily: "monospace",
    },
    "& .fr-account-col": {
      overflow: "hidden",
      textOverflow: "ellipsis",
    },
    "& .fr-amount-col, & .fr-change-col, & .fr-pct-col": {
      whiteSpace: "nowrap",
    },
  };
}

export const financeReportSummaryCellSx = {
  fontWeight: 600,
  color: "text.secondary",
  borderTop: 1,
  borderColor: "divider",
};

export function financeReportSummaryAmountCellSx(value) {
  return {
    ...financeReportSummaryCellSx,
    color: signedAmountColor(value),
  };
}

export function FinanceReportColGroup({ compareEnabled }) {
  return (
    <colgroup>
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
  );
}

export function CompareMetricCells({ current, compare, sx = {} }) {
  const change = amountChange(current, compare);
  const changeColor = signedAmountColor(change);

  return (
    <>
      <TableCell
        align="right"
        className="fr-change-col"
        sx={{ ...sx, color: changeColor }}
      >
        {formatSignedKyats(change)}
      </TableCell>
      <TableCell
        align="right"
        className="fr-pct-col"
        sx={{ ...sx, color: changeColor }}
      >
        {formatPercentChange(current, compare)}
      </TableCell>
    </>
  );
}

export function SummaryAmountCells({
  amount,
  compareAmount,
  compareEnabled,
  sx = {},
  primaryAmountSx,
  compareAmountSx,
}) {
  return (
    <>
      <TableCell
        align="right"
        className="fr-amount-col"
        sx={primaryAmountSx ?? sx}
      >
        {formatKyats(amount ?? 0)}
      </TableCell>
      {compareEnabled ? (
        <>
          <TableCell
            align="right"
            className="fr-amount-col"
            sx={compareAmountSx ?? primaryAmountSx ?? sx}
          >
            {formatKyats(compareAmount ?? 0)}
          </TableCell>
          <CompareMetricCells
            current={amount}
            compare={compareAmount}
            sx={sx}
          />
        </>
      ) : null}
    </>
  );
}
