import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  Divider,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { formatKyats } from "../../utils/formatKyats";
import {
  amortizationListSummary,
  formatPeriod,
  isPrepaidAmortizationReady,
} from "../../utils/prepaidAmortizationUtils";
import FinanceStatusLabel from "./FinanceStatusLabel";
import { useFinanceTokens } from "./financeTokens";

function formatDate(value) {
  if (!value) return "—";
  const d = dayjs(value);
  return d.isValid() ? d.format("DD-MM-YYYY") : value;
}

function DetailCell({ label, value, fullWidth = false }) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <Box sx={{ gridColumn: fullWidth ? "1 / -1" : undefined, py: 0.5 }}>
      <Typography
        variant="caption"
        sx={{
          display: "block",
          fontWeight: 600,
          color: "text.secondary",
          textTransform: "uppercase",
          fontSize: "0.625rem",
          mb: 0.25,
        }}
      >
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}

export default function PrepaidExpenseDetailPanel({
  prepaid,
  postingPeriod,
  rolePrefix,
  canManage,
  posting,
  onPostPeriod,
  onPostCatchUp,
}) {
  const { compactTableSx } = useFinanceTokens();
  const summary = amortizationListSummary(
    prepaid,
    postingPeriod.period_year,
    postingPeriod.period_month,
  );
  const ready = isPrepaidAmortizationReady(prepaid);
  const pendingPayment =
    !prepaid.is_opening_balance && prepaid.journal_posting_status === "pending";

  return (
    <Box sx={{ px: { xs: 1, sm: 2 }, pb: 2 }}>
      <Box
        sx={{
          display: "grid",
          gap: 1,
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
          mb: 2,
        }}
      >
        <DetailCell label="Type" value={prepaid.type?.name ?? "—"} />
        <DetailCell label="Source" value={prepaid.source_label ?? "—"} />
        <DetailCell
          label="Original amount"
          value={formatKyats(prepaid.original_amount)}
        />
        <DetailCell
          label="Remaining balance"
          value={formatKyats(prepaid.remaining_balance)}
        />
        <DetailCell label="Coverage" value={`${formatDate(prepaid.coverage_start)} – ${formatDate(prepaid.coverage_end)}`} />
        <DetailCell
          label="Remaining months"
          value={String(prepaid.remaining_months ?? "—")}
        />
        <DetailCell
          label="Amortized to date"
          value={formatKyats(prepaid.amortized_to_date)}
        />
        <DetailCell label="Status">
          <FinanceStatusLabel active={prepaid.status === "active"} />
        </DetailCell>
        {prepaid.description ? (
          <DetailCell label="Memo" value={prepaid.description} fullWidth />
        ) : null}
      </Box>

      {pendingPayment ? (
        <AlertLinkToTransactions rolePrefix={rolePrefix} prepaidId={prepaid.id} />
      ) : null}

      {canManage && ready && prepaid.status === "active" ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
          <Button
            size="small"
            variant="contained"
            disabled={posting || !summary.selectedDue || summary.selectedPosted}
            onClick={() => void onPostPeriod?.(prepaid)}
          >
            Post {formatPeriod(postingPeriod.period_year, postingPeriod.period_month)}
          </Button>
          <Button
            size="small"
            variant="outlined"
            disabled={posting || summary.dueCount <= 1}
            onClick={() => void onPostCatchUp?.(prepaid)}
          >
            Catch up ({summary.dueCount} periods)
          </Button>
        </Stack>
      ) : null}

      <Divider sx={{ mb: 1.5 }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Amortization history
      </Typography>
      {(prepaid.amortizations || []).length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No amortization posted yet.
        </Typography>
      ) : (
        <Table size="small" sx={compactTableSx}>
          <TableHead>
            <TableRow>
              <TableCell>Period</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell align="right">Balance after</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...(prepaid.amortizations || [])]
              .sort((a, b) => {
                if (a.period_year !== b.period_year) {
                  return b.period_year - a.period_year;
                }
                return b.period_month - a.period_month;
              })
              .map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    {formatPeriod(row.period_year, row.period_month)}
                  </TableCell>
                  <TableCell align="right">
                    {formatKyats(row.amortization_amount)}
                  </TableCell>
                  <TableCell align="right">
                    {formatKyats(row.remaining_balance_after)}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}

function AlertLinkToTransactions({ rolePrefix, prepaidId }) {
  return (
    <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
      Payment journal is still pending.{" "}
      <Link
        component={RouterLink}
        to={`${rolePrefix}/finance/transactions`}
        state={{
          financeHighlight: {
            sourceType: "prepaid_expense",
            sourceId: prepaidId,
            highlightColumn: "reference",
          },
        }}
      >
        Post from Transactions
      </Link>{" "}
      before running amortization.
    </Typography>
  );
}
