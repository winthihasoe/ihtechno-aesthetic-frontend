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
  depreciationListSummary,
  formatPeriod,
  periodFromMonthKey,
} from "../../utils/fixedAssetDepreciationUtils";
import { useFinanceTokens } from "./financeTokens";
import FinanceStatusLabel from "./FinanceStatusLabel";

function formatDate(value) {
  if (!value) return null;
  const d = dayjs(value);
  return d.isValid() ? d.format("DD-MM-YYYY") : value;
}

function depreciationMethodLabel(value) {
  if (value === "declining_balance") return "Declining balance";
  if (value === "units_of_production") return "Units of production";
  return "Straight line";
}

function totalCapitalizedCost(asset) {
  const base = Number(asset.purchase_cost) || 0;
  const extra = (asset.additional_capitalized_costs || []).reduce(
    (sum, line) => sum + (Number(line.amount) || 0),
    0,
  );
  return Math.round((base + extra) * 100) / 100;
}

function latestDepreciation(asset) {
  const runs = [...(asset.depreciations || [])].sort((a, b) => {
    if (a.period_year !== b.period_year) {
      return b.period_year - a.period_year;
    }
    return b.period_month - a.period_month;
  });
  return runs[0] ?? null;
}

function accumulatedDepreciation(asset) {
  const latest = latestDepreciation(asset);
  if (latest?.accumulated_depreciation != null) {
    return Number(latest.accumulated_depreciation);
  }
  return Number(asset.accumulated_depreciation_to_date) || 0;
}

function netBookValue(asset) {
  const latest = latestDepreciation(asset);
  if (latest?.net_book_value != null) {
    return Number(latest.net_book_value);
  }
  return Math.max(
    totalCapitalizedCost(asset) - accumulatedDepreciation(asset),
    0,
  );
}

function periodLabel(year, month) {
  if (!year || !month) return "—";
  return dayjs(`${year}-${String(month).padStart(2, "0")}-01`).format(
    "MMM YYYY",
  );
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

export default function FixedAssetDetailPanel({
  asset,
  sourceHref,
  canManage = false,
  postingMonth,
  onPostDepreciation,
}) {
  const { compactTableSx } = useFinanceTokens();
  const postingPeriod = periodFromMonthKey(postingMonth);
  const depSummary = depreciationListSummary(
    asset,
    postingPeriod.period_year,
    postingPeriod.period_month,
  );
  const capitalized = totalCapitalizedCost(asset);
  const accumulated = accumulatedDepreciation(asset);
  const nbv = netBookValue(asset);
  const residual = Number(asset.residual_value) || 0;
  const extraCosts = asset.additional_capitalized_costs || [];
  const depreciations = [...(asset.depreciations || [])].sort((a, b) => {
    if (a.period_year !== b.period_year) {
      return b.period_year - a.period_year;
    }
    return b.period_month - a.period_month;
  });

  return (
    <Box
      sx={{
        p: 2,
        mb: 0.25,
        borderRadius: 1,
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
      onClick={(e) => e.stopPropagation()}
    >
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
            {asset.asset_name}
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
                fontFamily: "ui-monospace, monospace",
                fontWeight: 600,
                color: "text.secondary",
              }}
            >
              {asset.asset_code}
            </Typography>
            <FinanceStatusLabel active={asset.status !== "retired"} />
            {asset.is_opening_balance ? (
              <Typography variant="caption" color="info.main" fontWeight={600}>
                Opening balance
              </Typography>
            ) : null}
            {asset.is_intangible ? (
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
              >
                Intangible
              </Typography>
            ) : null}
          </Stack>
        </Box>

        {canManage ? (
          <Stack direction="row" spacing={0.75} flexWrap="wrap">
            {depSummary.selectedDue && !depSummary.selectedPosted ? (
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  onPostDepreciation?.(asset.id, { catchUp: false })
                }
              >
                Post{" "}
                {formatPeriod(
                  postingPeriod.period_year,
                  postingPeriod.period_month,
                )}
              </Button>
            ) : null}
            {/* {depSummary.dueCount > 0 && !depSummary.selectedPosted ? (
              <Button
                size="small"
                variant="contained"
                onClick={() =>
                  onPostDepreciation?.(asset.id, { catchUp: true })
                }
              >
                Catch up ({depSummary.dueCount})
              </Button>
            ) : null} */}
          </Stack>
        ) : null}
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
        <SummaryStat
          label={
            asset.is_opening_balance ? "Deemed cost (NBV at import)" : "Capitalized cost"
          }
          value={formatKyats(capitalized)}
        />
        <SummaryStat
          label="Accumulated depreciation"
          value={formatKyats(accumulated)}
          accent="warning.main"
        />
        <SummaryStat
          label="Net book value"
          value={formatKyats(nbv)}
          accent="success.main"
        />
        <SummaryStat label="Residual value" value={formatKyats(residual)} />
      </Box>

      {depSummary.due.length ? (
        <Box sx={{ mb: 1.25 }}>
          <SectionTitle>
            Missing through{" "}
            {formatPeriod(
              postingPeriod.period_year,
              postingPeriod.period_month,
            )}
          </SectionTitle>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 0.5 }}
          >
            {depSummary.due
              .map((p) => formatPeriod(p.period_year, p.period_month))
              .join(" · ")}
          </Typography>
        </Box>
      ) : depSummary.lastLabel ? (
        <Box sx={{ mb: 1.25 }}>
          <Typography variant="caption" color="success.main" fontWeight={600}>
            Posted through {depSummary.lastLabel}
          </Typography>
        </Box>
      ) : null}

      <SectionTitle>Identification</SectionTitle>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
          },
          gap: 0.75,
          mb: 1.25,
        }}
      >
        <DetailCell
          label="Category"
          value={asset.category_relation?.name ?? asset.category ?? "—"}
        />
        <DetailCell label="Manufacturer" value={asset.manufacturer} />
        <DetailCell label="Model" value={asset.model} />
        <DetailCell label="Serial number" value={asset.serial_number} />
        <DetailCell label="Barcode / tag" value={asset.barcode} />
        <DetailCell
          label="Regulatory license"
          value={asset.regulatory_license_no}
        />
      </Box>

      <SectionTitle>Financial & depreciation</SectionTitle>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
          },
          gap: 1,
          mb: extraCosts.length ? 0.75 : 1.25,
        }}
      >
        <DetailCell
          label={
            asset.is_opening_balance
              ? "Deemed cost (NBV at import)"
              : "Base purchase cost"
          }
          value={formatKyats(asset.purchase_cost)}
        />
        <DetailCell
          label={
            asset.is_opening_balance
              ? "Remaining useful life at import"
              : "Useful life"
          }
          value={
            asset.useful_life_months
              ? `${asset.useful_life_months} months`
              : null
          }
        />
        <DetailCell
          label="Depreciation method"
          value={depreciationMethodLabel(asset.depreciation_method)}
        />
        <DetailCell
          label="Opening balance date"
          value={formatDate(asset.opening_balance_date)}
        />
        {asset.is_opening_balance ? null : (
          <DetailCell
            label="Accum. dep. at opening"
            value={formatKyats(asset.accumulated_depreciation_to_date)}
          />
        )}
        <DetailCell
          label="Quantity"
          value={asset.quantity > 1 ? String(asset.quantity) : null}
        />
      </Box>

      {extraCosts.length ? (
        <Box sx={{ mb: 1.25 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            sx={{ mb: 0.75 }}
          >
            Additional capitalized costs
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, minmax(0, 1fr))",
              },
              gap: 1,
            }}
          >
            {extraCosts.map((line, index) => (
              <DetailCell
                key={`${line.label}-${index}`}
                label={line.label || "Cost line"}
                value={formatKyats(line.amount)}
              />
            ))}
          </Box>
        </Box>
      ) : null}

      <SectionTitle>Dates & location</SectionTitle>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(3, minmax(0, 1fr))",
          },
          gap: 0.75,
          mb: 1.25,
        }}
      >
        <DetailCell
          label="Purchase date"
          value={formatDate(asset.purchase_date)}
        />
        <DetailCell
          label="In-service date"
          value={formatDate(asset.in_service_date)}
        />
        <DetailCell
          label="Warranty expiry"
          value={formatDate(asset.warranty_expiry_date)}
        />
        <DetailCell
          label="Next service"
          value={formatDate(asset.next_service_date)}
        />
        <DetailCell
          label="Insurance expiry"
          value={formatDate(asset.insurance_expiry_date)}
        />
        <DetailCell label="Room location" value={asset.room_location} />
        <DetailCell label="Custodian" value={asset.custodian?.name} />
        <DetailCell label="Supplier" value={asset.supplier?.name} />
        <DetailCell
          label="Insurance policy"
          value={asset.insurance_policy_no}
        />
      </Box>

      <SectionTitle>Source & notes</SectionTitle>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
          },
          gap: 1,
          mb: depreciations.length ? 1 : 0,
        }}
      >
        <DetailCell label="Source">
          {sourceHref ? (
            <Link component={RouterLink} to={sourceHref} underline="hover">
              {asset.source_label ?? "—"}
            </Link>
          ) : (
            (asset.source_label ?? "—")
          )}
        </DetailCell>
        <DetailCell
          label="Import batch"
          value={
            asset.import_batch?.file_name
              ? `${asset.import_batch.file_name} (#${asset.import_batch_id})`
              : asset.import_batch_id
                ? `#${asset.import_batch_id}`
                : null
          }
        />
        <DetailCell label="Imported from" value={asset.imported_from} />
        {asset.is_shot_rated ? (
          <DetailCell
            label="Rated shots"
            value={asset.rated_shots ? String(asset.rated_shots) : "Shot-rated"}
          />
        ) : null}
        <DetailCell label="Notes" value={asset.notes} fullWidth />
      </Box>

      {depreciations.length ? (
        <>
          <Divider sx={{ my: 1 }} />
          <SectionTitle>
            Depreciation runs ({depreciations.length})
          </SectionTitle>
          <Table
            size="small"
            sx={{
              ...compactTableSx,
              mt: 0.5,
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell>Period</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="right">Accumulated</TableCell>
                <TableCell align="right">Net book value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {depreciations.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>
                    {periodLabel(run.period_year, run.period_month)}
                  </TableCell>
                  <TableCell align="right">
                    {formatKyats(run.depreciation_amount)}
                  </TableCell>
                  <TableCell align="right">
                    {formatKyats(run.accumulated_depreciation)}
                  </TableCell>
                  <TableCell align="right">
                    {formatKyats(run.net_book_value)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : null}
    </Box>
  );
}
