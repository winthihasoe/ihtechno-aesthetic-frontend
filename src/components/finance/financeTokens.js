import { useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import { brandRgba } from "../../theme/brandColors";

const LIGHT_BRAND_GLASS =
  "linear-gradient(155deg, rgba(255,255,255,0.82), rgba(217,232,181,0.62) 48%, rgba(32,157,161,0.1) 100%)";

const LIGHT_BRAND_GLASS_HEADER =
  "linear-gradient(160deg, rgba(32,157,161,0.2), rgba(32,157,161,0.12) 55%, rgba(30,61,62,0.08) 100%)";

function glassBlur(blur = 14) {
  return {
    backdropFilter: `blur(${blur}px) saturate(1.12)`,
    WebkitBackdropFilter: `blur(${blur}px) saturate(1.12)`,
  };
}

/** Outer ledger panel — brand glass with soft feathered edge. */
export function getFinanceSurfaceSx(theme) {
  const isLight = theme.palette.mode === "light";

  if (isLight) {
    return {
      bgcolor: "rgba(255, 255, 255, 0.62)",
      backgroundImage: LIGHT_BRAND_GLASS,
      border: `1px solid ${brandRgba("primary", 0.24)}`,
      borderRadius: 0.5,
      boxShadow:
        "0 10px 40px rgba(30, 61, 62, 0.1), 0 2px 12px rgba(30, 61, 62, 0.06), inset 0 1px 0 rgba(255,255,255,0.45)",
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
    borderColor: isLight ? brandRgba("primary", 0.14) : theme.palette.divider,
  };
}

/** Filter / period strip inside a continuous panel — divider only. */
export function getFinanceFilterStripSx(theme) {
  const isLight = theme.palette.mode === "light";

  return {
    px: 2.5,
    py: 1.5,
    borderBottom: "1px solid",
    borderColor: isLight ? brandRgba("primary", 0.14) : theme.palette.divider,
  };
}

/** @deprecated Use TableContainer with financeTableContainerSx directly in the panel. */
export function getFinanceTableWrapSx() {
  return {};
}

/** Table area inside a continuous panel — flat, no inner bordered box. */
export function getFinanceTableContainerSx() {
  return {
    overflow: "hidden",
  };
}

export function getCompactTableSx(theme) {
  const isLight = theme.palette.mode === "light";
  const rowBg = isLight ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.02)";
  const rowHover = isLight
    ? "rgba(255,255,255,0.44)"
    : "rgba(255,255,255,0.05)";
  const bodyColor = isLight
    ? brandRgba("text", 0.92)
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
        ? `1px solid ${brandRgba("primary", 0.1)}`
        : `1px solid ${theme.palette.divider}`,
    },
    "& .MuiTableCell-head": {
      fontSize: "0.6875rem",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: "text.primary",
      bgcolor: isLight ? brandRgba("primary", 0.14) : "rgba(255,255,255,0.06)",
      backgroundImage: isLight ? LIGHT_BRAND_GLASS_HEADER : "none",
      p: 2,
      whiteSpace: "nowrap",
      borderBottom: isLight
        ? `1px solid ${brandRgba("primary", 0.22)}`
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
      bgcolor: isLight ? brandRgba("primary", 0.1) : "rgba(255,255,255,0.05)",
      backgroundImage: isLight
        ? `linear-gradient(90deg, ${brandRgba("primary", 0.14)}, ${brandRgba("secondary", 0.2)})`
        : "none",
      borderBottom: isLight
        ? `1px solid ${brandRgba("primary", 0.14)}`
        : `1px solid ${theme.palette.divider}`,
      borderTop: isLight
        ? `1px solid ${brandRgba("primary", 0.1)}`
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
      py: 0.35,
      color: isLight ? brandRgba("text", 0.95) : theme.palette.text.primary,
      bgcolor: isLight ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.06)",
      ...glassBlur(4),
    },
    "& .MuiInputLabel-root": {
      fontSize: "0.75rem",
      fontWeight: 500,
      color: isLight ? brandRgba("text", 0.82) : theme.palette.text.secondary,
    },
    "& .MuiSelect-select": { py: 0.75 },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: isLight ? brandRgba("primary", 0.3) : "rgba(255,255,255,0.14)",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: isLight ? brandRgba("primary", 0.45) : "rgba(255,255,255,0.22)",
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
    color: isLight ? brandRgba("text", 0.52) : theme.palette.text.disabled,
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
      color: `${isLight ? brandRgba("text", 0.35) : theme.palette.text.disabled} !important`,
      fontWeight: 400,
    },
    "& .finance-credit-cell": {
      color: `${creditColor} !important`,
      fontWeight: 600,
      fontVariantNumeric: "tabular-nums",
      fontFeatureSettings: '"tnum"',
    },
    "& .finance-credit-cell.is-zero": {
      color: `${isLight ? brandRgba("text", 0.35) : theme.palette.text.disabled} !important`,
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
