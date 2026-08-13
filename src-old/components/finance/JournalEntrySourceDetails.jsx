import { Link as RouterLink } from "react-router-dom";
import { Box, Link, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";
import { formatKyats } from "../../utils/formatKyats";
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

const SOURCE_TYPE_COLOR = {
  invoice: "success.main",
  payment_transaction: "info.main",
  expense: "warning.main",
  other_income: "success.main",
  supplier_payable: "warning.main",
  payable_transaction: "info.main",
  manual: "text.secondary",
  journal_entry: "text.secondary",
  inventory_adjustment: "warning.main",
};

function sourceTypeColor(sourceType) {
  const base = normalizeJournalSourceType(sourceType);
  return SOURCE_TYPE_COLOR[base] ?? "text.secondary";
}

function categoryAccent(category) {
  switch (category) {
    case "income":
      return "success.main";
    case "expense":
      return "warning.main";
    case "transfer":
      return "info.main";
    default:
      return "text.primary";
  }
}

function sumActiveLines(lines) {
  let debit = 0;
  let credit = 0;
  for (const line of lines ?? []) {
    if (line.voided_at) continue;
    debit += Number(line.debit) || 0;
    credit += Number(line.credit) || 0;
  }
  return { debit, credit };
}

function DetailCell({ label, value, children, fullWidth = false }) {
  const content = children ?? value;
  if (content == null || content === "" || content === "—") return null;

  return (
    <Box
      sx={{
        gridColumn: fullWidth ? "1 / -1" : undefined,
        py: 0.5,
        minWidth: 0,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: "block",
          fontWeight: 600,
          color: "text.secondary",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          fontSize: "0.625rem",
          mb: 0.25,
          lineHeight: 1.3,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="caption"
        component="div"
        sx={{
          display: "block",
          fontWeight: 500,
          color: "text.primary",
          fontSize: "0.8125rem",
          lineHeight: 1.35,
          wordBreak: "break-word",
        }}
      >
        {content}
      </Typography>
    </Box>
  );
}

function SummaryStat({ label, value, accent }) {
  return (
    <Box sx={{ minWidth: 0, py: 0.25 }}>
      <Typography
        variant="caption"
        sx={{
          display: "block",
          color: "text.secondary",
          fontWeight: 600,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
          fontSize: "0.625rem",
          mb: 0.25,
          lineHeight: 1.3,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
          color: accent ?? "text.primary",
          lineHeight: 1.25,
          fontSize: "0.875rem",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

function SectionTitle({ children }) {
  return (
    <Typography
      variant="caption"
      sx={{
        display: "block",
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: "text.secondary",
        fontSize: "0.6875rem",
        mb: 0.5,
        mt: 0.25,
      }}
    >
      {children}
    </Typography>
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
  actions = null,
}) {
  const prefix = rolePrefix || "";
  const sourceTypeLabel = journalSourceTypeLabel(entry?.source_type);
  const reversedLabel = entry?.reversed_at
    ? `Reversed ${formatPostedAt(entry.reversed_at) ?? ""}`.trim()
    : null;
  const hasNav = Boolean(buildJournalSourceNavigation(prefix, entry, pathname));
  const title = entry?.name ?? entry?.memo ?? "Journal entry";
  const showMemo =
    entry?.memo &&
    entry.memo.trim() !== "" &&
    entry.memo.trim() !== String(title).trim();
  const { debit, credit } = sumActiveLines(entry?.lines);

  return (
    <Box onClick={(e) => e.stopPropagation()}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1}
        sx={{ mb: 1.25 }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: "0.875rem",
              fontWeight: 700,
              lineHeight: 1.35,
              wordBreak: "break-word",
              mb: 0.35,
            }}
          >
            {title}
          </Typography>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
          >
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: sourceTypeColor(entry?.source_type),
              }}
            >
              {sourceTypeLabel}
            </Typography>
            {entry?.source_label ? (
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {entry.source_label}
              </Typography>
            ) : null}
            {entry?.is_manual ? (
              <Typography variant="caption" color="primary.main" fontWeight={600}>
                Manual
              </Typography>
            ) : null}
            {entry?.is_auto_posted && !entry?.is_manual ? (
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Auto-posted
              </Typography>
            ) : null}
            {entry?.reversed_at ? (
              <Typography variant="caption" color="warning.main" fontWeight={700}>
                Reversed
              </Typography>
            ) : null}
          </Stack>
        </Box>
        {actions}
      </Stack>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            md: "repeat(4, minmax(0, 1fr))",
          },
          gap: 1,
          mb: 1.25,
          py: 0.75,
          px: 1,
          borderRadius: 1,
          bgcolor: "rgba(255,255,255,0.03)",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <SummaryStat label="Amount" value={formatKyats(entry?.amount ?? 0)} />
        <SummaryStat
          label="Total debit"
          value={formatKyats(debit)}
          accent="info.main"
        />
        <SummaryStat
          label="Total credit"
          value={formatKyats(credit)}
          accent="success.main"
        />
        <SummaryStat
          label="Entry type"
          value={entry?.entry_category_label ?? "—"}
          accent={categoryAccent(entry?.entry_category)}
        />
      </Box>

      <SectionTitle>Source &amp; reference</SectionTitle>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
          },
          gap: 0.75,
        }}
      >
        {showMemo ? <DetailCell label="Memo" value={entry.memo} fullWidth /> : null}
        {entry?.source_reference ? (
          <DetailCell label="Reference">
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
          </DetailCell>
        ) : null}
        {entry?.source_id ? (
          <DetailCell label="Source ID">
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
          </DetailCell>
        ) : null}
        {entry?.journal_no ? (
          <DetailCell label="Journal no.">
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
          </DetailCell>
        ) : null}
        {entry?.journal_date ? (
          <DetailCell label="Posted date">
            {dayjs(entry.journal_date).format("DD-MM-YYYY")}
          </DetailCell>
        ) : null}
        {entry?.source_event_date ? (
          <DetailCell label="Source date">
            {dayjs(entry.source_event_date).format("DD-MM-YYYY")}
          </DetailCell>
        ) : null}
        {reversedLabel ? (
          <DetailCell label="Status">
            <Typography
              variant="caption"
              color="warning.main"
              fontWeight={600}
              sx={{ fontSize: "0.8125rem" }}
            >
              {reversedLabel}
            </Typography>
          </DetailCell>
        ) : null}
      </Box>
    </Box>
  );
}

export { rolePrefixFromPathname };
