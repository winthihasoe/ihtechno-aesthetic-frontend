import { Link as RouterLink } from "react-router-dom";
import { Box, Link, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";
import { formatKyats } from "../../utils/formatKyats";
import {
  buildTransactionDetailNavigation,
  journalSourceTypeLabel,
  normalizeJournalSourceType,
} from "../../utils/financeSourceNavigation";

const SOURCE_TYPE_COLOR = {
  invoice: "success.main",
  payment_transaction: "info.main",
  expense: "warning.main",
  other_income: "success.main",
  supplier_payable: "warning.main",
  payable_transaction: "info.main",
  purchase: "warning.main",
  supplier_return: "warning.main",
  staff_deposit_transaction: "info.main",
};

function sourceTypeColor(sourceType) {
  const base = normalizeJournalSourceType(sourceType);
  return SOURCE_TYPE_COLOR[base] ?? "text.secondary";
}

function statusLabel(status) {
  if (status === "posted") return "Posted";
  if (status === "reversed") return "Reversed";
  return "Pending";
}

function statusColor(status) {
  if (status === "posted") return "success.main";
  if (status === "reversed") return "warning.main";
  return "text.secondary";
}

function sumLines(lines) {
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
  row,
  rolePrefix,
  pathname,
  contextMonth,
  children,
  color = "primary.main",
}) {
  const nav = buildTransactionDetailNavigation(rolePrefix, row, pathname);
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
      state={{
        ...nav.state,
        financeContextMonth: contextMonth || undefined,
      }}
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

export default function TransactionQueueDetails({
  row,
  rolePrefix,
  pathname = "",
  contextMonth = "",
  detail = null,
  actions = null,
}) {
  const sourceTypeLabel =
    row?.type_label ?? journalSourceTypeLabel(row?.source_type);
  const lines = detail?.lines ?? [];
  const { debit, credit } = sumLines(lines);
  const showMemo =
    detail?.memo &&
    detail.memo.trim() !== "" &&
    detail.memo.trim() !== String(row?.name ?? "").trim();

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
            {row?.name ?? "Transaction"}
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
                color: sourceTypeColor(row?.source_type),
              }}
            >
              {sourceTypeLabel}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: statusColor(row?.journal_posting_status),
              }}
            >
              {statusLabel(row?.journal_posting_status)}
            </Typography>
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
        <SummaryStat label="Amount" value={formatKyats(row?.amount ?? 0)} />
        <SummaryStat
          label="Total debit"
          value={lines.length > 0 ? formatKyats(debit) : "—"}
          accent="info.main"
        />
        <SummaryStat
          label="Total credit"
          value={lines.length > 0 ? formatKyats(credit) : "—"}
          accent="success.main"
        />
        <SummaryStat
          label="Event date"
          value={
            row?.event_date
              ? dayjs(row.event_date).format("DD-MM-YYYY")
              : "—"
          }
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
        {row?.name ? <DetailCell label="Party" value={row.name} /> : null}
        {showMemo ? (
          <DetailCell label="Journal memo" value={detail.memo} fullWidth />
        ) : null}
        {row?.reference ? (
          <DetailCell label="Reference">
            <SourceNavLink
              row={row}
              rolePrefix={rolePrefix}
              pathname={pathname}
              contextMonth={contextMonth}
            >
              {row.reference}
            </SourceNavLink>
          </DetailCell>
        ) : null}
        {row?.source_id ? (
          <DetailCell label="Source ID">#{row.source_id}</DetailCell>
        ) : null}
        {detail?.journalDate ? (
          <DetailCell label="Journal date">
            {dayjs(detail.journalDate).format("DD-MM-YYYY")}
          </DetailCell>
        ) : null}
        {detail?.journalNo ? (
          <DetailCell label="Journal no.">
            <Box
              component="span"
              sx={{
                fontWeight: 600,
                fontFamily: "ui-monospace, monospace",
                letterSpacing: "0.03em",
              }}
            >
              {detail.journalNo}
            </Box>
          </DetailCell>
        ) : null}
        {row?.payment_id ? (
          <DetailCell label="Invoice ID">#{row.payment_id}</DetailCell>
        ) : null}
        {row?.payable_id ? (
          <DetailCell label="Payable ID">#{row.payable_id}</DetailCell>
        ) : null}
        {row?.posted_journal_entry_id ? (
          <DetailCell label="Posted journal entry">
            #{row.posted_journal_entry_id}
          </DetailCell>
        ) : null}
      </Box>
    </Box>
  );
}

export { SectionTitle as TransactionLinesSectionTitle };
