import { Link as RouterLink } from "react-router-dom";
import { Box, Chip, Link, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";
import {
  buildJournalSourceNavigation,
  journalSourceTypeLabel,
  normalizeJournalSourceType,
  rolePrefixFromPathname,
} from "../../utils/financeSourceNavigation";

function formatPostedAt(value) {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD-MM-YYYY HH:mm") : null;
}

const SOURCE_CHIP_COLOR = {
  invoice: "success",
  payment_transaction: "info",
  expense: "warning",
  other_income: "success",
  supplier_payable: "warning",
  payable_transaction: "info",
  manual: "default",
  journal_entry: "default",
};

function sourceChipColor(sourceType) {
  const base = normalizeJournalSourceType(sourceType);
  return SOURCE_CHIP_COLOR[base] ?? "default";
}

function DetailRow({ label, children, valueSx }) {
  if (children == null || children === "") return null;
  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="baseline"
      sx={{ lineHeight: 1.5 }}
    >
      <Typography
        variant="caption"
        component="span"
        sx={{
          fontWeight: 600,
          color: "text.secondary",
          minWidth: 88,
          flexShrink: 0,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="caption"
        component="div"
        sx={{ color: "text.primary", ...valueSx }}
      >
        {children}
      </Typography>
    </Stack>
  );
}

function SourceNavLink({
  entry,
  rolePrefix,
  pathname,
  highlightColumn,
  contextMonth,
  children,
  color = "primary.main",
}) {
  const nav = buildJournalSourceNavigation(rolePrefix, entry, pathname, {
    highlightColumn,
    contextMonth,
  });
  if (!nav) {
    return (
      <Box component="span" sx={{ fontWeight: 600, color }}>
        {children}
      </Box>
    );
  }

  return (
    <Link
      component={RouterLink}
      to={nav.path}
      state={nav.state}
      underline="hover"
      sx={{
        fontWeight: 700,
        color,
        fontSize: "inherit",
        fontVariantNumeric: "tabular-nums",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </Link>
  );
}

export default function JournalEntrySourceDetails({
  entry,
  rolePrefix,
  pathname = "",
  contextMonth = "",
}) {
  const prefix = rolePrefix || "";
  const sourceTypeLabel = journalSourceTypeLabel(entry?.source_type);
  const reversedLabel = entry?.reversed_at
    ? `Reversed ${formatPostedAt(entry.reversed_at) ?? ""}`.trim()
    : null;
  const hasNav = Boolean(buildJournalSourceNavigation(prefix, entry, pathname));

  return (
    <Box
      sx={{
        p: 1.25,
        borderRadius: 1,
        bgcolor: "rgba(255,255,255,0.03)",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700, mb: 0.75 }}>
        {entry?.name ?? entry?.memo ?? "Journal entry"}
      </Typography>

      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" sx={{ mb: 1 }}>
        <Chip
          size="small"
          label={sourceTypeLabel}
          color={sourceChipColor(entry?.source_type)}
          variant="outlined"
          sx={{ fontWeight: 600, fontSize: "0.6875rem", height: 22 }}
        />
        {entry?.source_label ? (
          <Typography variant="caption" color="text.secondary">
            {entry.source_label}
          </Typography>
        ) : null}
        {entry?.reversed_at ? (
          <Chip
            size="small"
            label="Reversed"
            color="warning"
            variant="filled"
            sx={{ fontSize: "0.6875rem", height: 22 }}
          />
        ) : null}
      </Stack>

      <Stack spacing={0.5}>
        {entry?.memo ? <DetailRow label="Memo">{entry.memo}</DetailRow> : null}
        {entry?.source_reference ? (
          <DetailRow label="Reference">
            <SourceNavLink
              entry={entry}
              rolePrefix={prefix}
              pathname={pathname}
              highlightColumn="reference"
              contextMonth={contextMonth}
              color="primary.main"
            >
              {entry.source_reference}
            </SourceNavLink>
          </DetailRow>
        ) : null}
        {entry?.source_id ? (
          <DetailRow
            label="Source ID"
            valueSx={
              hasNav
                ? {
                    fontVariantNumeric: "tabular-nums",
                  }
                : undefined
            }
          >
            <SourceNavLink
              entry={entry}
              rolePrefix={prefix}
              pathname={pathname}
              highlightColumn="sourceId"
              contextMonth={contextMonth}
              color="info.main"
            >
              #{entry.source_id}
            </SourceNavLink>
          </DetailRow>
        ) : null}
        {entry?.journal_no ? (
          <DetailRow label="Journal no.">
            <Box
              component="span"
              sx={{
                fontWeight: 600,
                fontFamily: "ui-monospace, monospace",
                letterSpacing: "0.03em",
              }}
            >
              {entry.journal_no}
            </Box>
          </DetailRow>
        ) : null}
        {entry?.journal_date ? (
          <DetailRow label="Posted date">
            {dayjs(entry.journal_date).format("DD-MM-YYYY")}
          </DetailRow>
        ) : null}
        {reversedLabel ? (
          <DetailRow label="Status">
            <Typography variant="caption" color="warning.main" fontWeight={600}>
              {reversedLabel}
            </Typography>
          </DetailRow>
        ) : null}
      </Stack>
    </Box>
  );
}

export { rolePrefixFromPathname };
