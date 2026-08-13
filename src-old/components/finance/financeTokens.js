import { useMemo } from "react";
import { useTheme } from "@mui/material/styles";

const LIGHT_PURPLE_GLASS =
  "linear-gradient(155deg, rgba(249, 188, 226, 0.92), rgba(207, 205, 208, 0.88) 48%, rgba(220,198,232,0.82) 100%)";

const LIGHT_PURPLE_GLASS_HEADER =
  "linear-gradient(160deg, rgba(118,78,128,0.22), rgba(98,62,108,0.18) 55%, rgba(88,56,102,0.14) 100%)";

function glassBlur(blur = 14) {
  return {
    backdropFilter: `blur(${blur}px) saturate(1.12)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(1.12)`,
  };
}

/** Outer ledger panel — purple glass with soft feathered edge. */
export function getFinanceSurfaceSx(theme) {
  const isLight = theme.palette.mode === "light";

  if (isLight) {
    return {
      bgcolor: "rgba(248, 240, 252, 0.72)",
      backgroundImage: LIGHT_PURPLE_GLASS,
      border: "1px solid rgba(120,78,120,0.26)",
      borderRadius: 0.5,
      boxShadow:
        "0 10px 40px rgba(66, 36, 66, 0.14), 0 2px 12px rgba(66, 36, 66, 0.08), inset 0 1px 0 rgba(255,255,255,0.45)",
      m: 0.5,
      ...glassBlur(16),
    };
  }

  return {
    bgcolor: "rgba(22, 27, 34, 0.92)",
    backgroundImage: "none",
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 0.5,
    boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
    m: 0.5,
    ...glassBlur(12),
  };
}

/** Inset for page title / alerts above a continuous ledger panel. */
export function getFinancePageHeaderSx() {
  return {
    px: { xs: 2, sm: 2.5 },
    pt: { xs: 2, sm: 2.5 },
    pb: 1,
  };
}

/** Toolbar row inside a continuous ledger panel — divider only, no nested card. */
export function getFinanceToolbarSx(theme) {
  const isLight = theme.palette.mode === "light";

  return {
    px: 2.5,
    py: 1.25,
    borderBottom: "1px solid",
    borderColor: isLight ? "rgba(120,78,120,0.14)" : theme.palette.divider,
  };
}

/** Filter / period strip inside a continuous panel — divider only. */
export function getFinanceFilterStripSx(theme) {
  const isLight = theme.palette.mode === "light";

  return {
    px: 2.5,
    py: 1.5,
    borderBottom: "1px solid",
    borderColor: isLight ? "rgba(120,78,120,0.14)" : theme.palette.divider,
  };
}

/** @deprecated Use TableContainer with financeTableContainerSx directly in the panel. */
export function getFinanceTableWrapSx() {
  return {};
}

/** Table area inside a continuous panel — flat, no inner bordered box. */
export function getFinanceTableContainerSx() {
  return {
    maxWidth: "100%",
    minWidth: 0,
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",
  };
}

export function getCompactTableSx(theme) {
  const isLight = theme.palette.mode === "light";
  const rowBg = isLight ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.02)";
  const rowHover = isLight
    ? "rgba(255,255,255,0.44)"
    : "rgba(255,255,255,0.05)";
  const bodyColor = isLight
    ? "rgba(46,28,52,0.92)"
    : theme.palette.text.primary;

  return {
    "& .MuiTableCell-root": {
      fontSize: "0.8125rem",
      fontWeight: 400,
      py: 1.5,
      px: 1.5,
      lineHeight: 1.45,
      verticalAlign: "middle",
      color: bodyColor,
      bgcolor: rowBg,
      borderBottom: isLight
        ? "1px solid rgba(120,78,120,0.1)"
        : `1px solid ${theme.palette.divider}`,
    },
    "& .MuiTableCell-head": {
      fontSize: "0.6875rem",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: "text.primary",
      bgcolor: isLight ? "rgba(106, 72, 114, 0.2)" : "rgba(255,255,255,0.06)",
      backgroundImage: isLight ? LIGHT_PURPLE_GLASS_HEADER : "none",
      p: 2,
      whiteSpace: "nowrap",
      borderBottom: isLight
        ? "1px solid rgba(120,78,120,0.24)"
        : `1px solid ${theme.palette.divider}`,
      ...glassBlur(4),
    },
    "& .MuiTableRow-root": {
      bgcolor: rowBg,
    },
    "& .MuiTableRow-hover:hover .MuiTableCell-root": {
      bgcolor: rowHover,
    },
  };
}

/** Section divider row inside a continuous ledger table (e.g. COA account type groups). */
export function getCoaGroupHeaderSx(theme) {
  const isLight = theme.palette.mode === "light";

  return {
    "& .MuiTableCell-root": {
      bgcolor: isLight ? "rgba(106, 72, 114, 0.14)" : "rgba(255,255,255,0.05)",
      backgroundImage: isLight
        ? "linear-gradient(90deg, rgba(118,78,128,0.16), rgba(98,62,108,0.08))"
        : "none",
      borderBottom: isLight
        ? "1px solid rgba(120,78,120,0.16)"
        : `1px solid ${theme.palette.divider}`,
      borderTop: isLight
        ? "1px solid rgba(120,78,120,0.12)"
        : `1px solid ${theme.palette.divider}`,
      py: 1,
      px: 1.5,
    },
  };
}

export function getCompactFieldSx(theme) {
  const isLight = theme.palette.mode === "light";

  return {
    "& .MuiInputBase-root": {
      fontSize: "0.8125rem",
      fontWeight: 500,
      minHeight: 36,
      color: isLight ? "rgba(46,28,52,0.95)" : theme.palette.text.primary,
      bgcolor: isLight ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.06)",
      boxSizing: "border-box",
      ...glassBlur(4),
    },
    "& .MuiInputBase-input:not(.MuiInputBase-inputMultiline)": {
      py: 0.625,
      px: 1.25,
      boxSizing: "border-box",
    },
    "& .MuiSelect-select": {
      py: 0.625,
      pl: 1.25,
      pr: 4,
      minHeight: "unset",
      display: "flex",
      alignItems: "center",
      boxSizing: "border-box",
    },
    "& .MuiInputLabel-root": {
      fontSize: "0.75rem",
      fontWeight: 500,
      color: isLight ? "rgba(74,46,85,0.85)" : theme.palette.text.secondary,
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: isLight ? "rgba(88,56,102,0.32)" : "rgba(255,255,255,0.14)",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: isLight ? "rgba(88,56,102,0.48)" : "rgba(255,255,255,0.22)",
    },
  };
}

export function getFinanceStatusActiveSx(theme) {
  const isLight = theme.palette.mode === "light";
  return {
    fontSize: "0.8125rem",
    fontWeight: 600,
    letterSpacing: "0.02em",
    color: isLight ? theme.palette.success.dark : theme.palette.success.light,
  };
}

export function getFinanceStatusInactiveSx(theme) {
  const isLight = theme.palette.mode === "light";
  return {
    fontSize: "0.8125rem",
    fontWeight: 500,
    letterSpacing: "0.02em",
    color: isLight ? "rgba(74,46,85,0.55)" : theme.palette.text.disabled,
  };
}

export const financeDebitColor = "info.main";
export const financeCreditColor = "success.main";

export const financeAmountSx = {
  fontVariantNumeric: "tabular-nums",
  fontWeight: 600,
  fontFeatureSettings: '"tnum"',
  letterSpacing: "0.02em",
};

/** Monospace styling for chart-of-accounts codes in tables and labels. */
export const financeCoaCodeSx = {
  fontFamily: "monospace",
};

export const financeCoaCodeCellSx = {
  ...financeCoaCodeSx,
  fontWeight: 600,
};

/** Ledger line table inside journal expand — keeps DR/CR colors over compactTableSx. */
export function getJournalLinesTableSx(theme) {
  const isLight = theme.palette.mode === "light";
  const debitColor = theme.palette.info.main;
  const creditColor = theme.palette.success.main;

  return {
    "& .MuiTableCell-head": {
      fontSize: "0.6875rem",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      py: 0.75,
      px: 1,
    },
    "& .journal-dr-header": {
      color: debitColor,
      textAlign: "right",
    },
    "& .journal-cr-header": {
      color: creditColor,
      textAlign: "right",
    },
    "& .finance-debit-cell": {
      color: `${debitColor} !important`,
      fontWeight: 600,
      fontVariantNumeric: "tabular-nums",
      fontFeatureSettings: '"tnum"',
    },
    "& .finance-debit-cell.is-zero": {
      color: `${isLight ? "rgba(46,28,52,0.35)" : theme.palette.text.disabled} !important`,
      fontWeight: 400,
    },
    "& .finance-credit-cell": {
      color: `${creditColor} !important`,
      fontWeight: 600,
      fontVariantNumeric: "tabular-nums",
      fontFeatureSettings: '"tnum"',
    },
    "& .finance-credit-cell.is-zero": {
      color: `${isLight ? "rgba(46,28,52,0.35)" : theme.palette.text.disabled} !important`,
      fontWeight: 400,
    },
  };
}

/** Theme-aware tokens for Financial Management surfaces and tables. */
export function useFinanceTokens() {
  const theme = useTheme();

  return useMemo(
    () => ({
      financeSurfaceSx: getFinanceSurfaceSx(theme),
      financePageHeaderSx: getFinancePageHeaderSx(),
      financeToolbarSx: getFinanceToolbarSx(theme),
      financeFilterStripSx: getFinanceFilterStripSx(theme),
      financeTableWrapSx: getFinanceTableWrapSx(),
      financeTableContainerSx: getFinanceTableContainerSx(),
      compactTableSx: getCompactTableSx(theme),
      coaGroupHeaderSx: getCoaGroupHeaderSx(theme),
      compactFieldSx: getCompactFieldSx(theme),
      statusActiveSx: getFinanceStatusActiveSx(theme),
      statusInactiveSx: getFinanceStatusInactiveSx(theme),
      financeDebitColor,
      financeCreditColor,
      financeAmountSx,
      journalLinesTableSx: getJournalLinesTableSx(theme),
    }),
    [theme],
  );
}
