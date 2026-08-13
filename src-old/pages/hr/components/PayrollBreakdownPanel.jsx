import {
  Box,
  Chip,
  Divider,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { formatKyats } from "../../../utils/formatKyats";

const SALARY_COMPONENT_LABELS = [
  ["basic_salary", "Basic salary"],
  ["basic_increase", "Basic increase"],
  ["yearly_increase", "Yearly increase"],
  ["license_amount", "License amount"],
  ["probation_increase", "Probation increase"],
];

const formatHumanDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatHours = (value) => {
  const hours = Number(value || 0);
  return `${hours.toFixed(2)} h`;
};

const formatMinutes = (value) => `${Number(value || 0)} min`;

const formatDateList = (dates) => {
  if (!Array.isArray(dates) || !dates.length) return "—";
  return dates.map((date) => formatHumanDate(date)).join(", ");
};

const effectiveValue = (row, field) => {
  const overrideField = `override_${field}`;
  return row?.[overrideField] ?? row?.[field] ?? 0;
};

const hasOverride = (row, field) => {
  const overrideField = `override_${field}`;
  return row?.[overrideField] !== null && row?.[overrideField] !== undefined;
};

const isCommissionAdjustment = (adjustment) =>
  adjustment?.type_key === "commission" ||
  (adjustment?.category === "variable_pay" &&
    String(adjustment?.type || "").toLowerCase() === "commission");

const isEarningAdjustment = (adjustment) => {
  if (isCommissionAdjustment(adjustment)) return false;
  if (adjustment?.category === "variable_pay") return true;
  return ["increment", "reward", "bonus"].includes(String(adjustment?.type || ""));
};

const isManualDeductionAdjustment = (adjustment) => {
  if (adjustment?.category === "deduction") return true;
  return ["fine", "deduction"].includes(String(adjustment?.type || ""));
};

const adjustmentLabel = (adjustment) =>
  adjustment?.type_label ||
  adjustment?.type ||
  (adjustment?.category === "deduction" ? "Deduction" : "Adjustment");

function BreakdownSection({ title, children, accent = "primary.main" }) {
  return (
    <Box
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 1.5,
        overflow: "hidden",
        bgcolor: "background.paper",
        height: "100%",
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 1,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "action.hover",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 800,
            letterSpacing: 0.6,
            textTransform: "uppercase",
            color: accent,
          }}
        >
          {title}
        </Typography>
      </Box>
      <Stack spacing={0.5} sx={{ p: 1.5 }}>
        {children}
      </Stack>
    </Box>
  );
}

function BreakdownLine({ label, detail, amount, tone = "default", emphasize = false }) {
  const amountColor =
    tone === "deduction"
      ? "error.main"
      : tone === "positive"
        ? "success.main"
        : "text.primary";

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", sm: "center" }}
      spacing={0.5}
      sx={{ py: 0.35 }}
    >
      <Box sx={{ minWidth: 0, pr: 1 }}>
        <Typography variant="body2" fontWeight={emphasize ? 700 : 500}>
          {label}
        </Typography>
        {detail ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {detail}
          </Typography>
        ) : null}
      </Box>
      <Typography
        variant="body2"
        fontWeight={emphasize ? 700 : 600}
        sx={{ color: amountColor, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
      >
        {amount}
      </Typography>
    </Stack>
  );
}

function OverrideNote({ row, field, label }) {
  if (!hasOverride(row, field)) return null;
  const autoValue = Number(row[field] || 0);
  const manualValue = Number(row[`override_${field}`] || 0);
  const reason = row.override_notes?.[field] || "No reason recorded.";
  const editor = row.overrider?.name ? ` · ${row.overrider.name}` : "";

  return (
    <Box
      sx={{
        mt: 1,
        p: 1.25,
        borderRadius: 1,
        border: 1,
        borderColor: "info.main",
        bgcolor: "rgba(33, 150, 243, 0.06)",
      }}
    >
      <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5 }}>
        <Chip size="small" color="info" label="Manual override" />
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      </Stack>
      <Typography variant="body2">
        Auto {formatKyats(autoValue)} → Manual {formatKyats(manualValue)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {reason}
        {editor}
      </Typography>
    </Box>
  );
}

export default function PayrollBreakdownPanel({ row }) {
  const breakdown = row?.breakdown || {};
  const adjustments = Array.isArray(breakdown.adjustments) ? breakdown.adjustments : [];
  const earningAdjustments = adjustments.filter(isEarningAdjustment);
  const commissionAdjustments = adjustments.filter(isCommissionAdjustment);
  const manualDeductionAdjustments = adjustments.filter(isManualDeductionAdjustment);
  const salaryComponents = breakdown.salary_components || {};
  const lateEntries = Array.isArray(breakdown.late_entries) ? breakdown.late_entries : [];

  const earningsTotal =
    Number(effectiveValue(row, "base_salary")) +
    Number(effectiveValue(row, "overtime_amount")) +
    Number(effectiveValue(row, "commission_amount")) +
    Number(effectiveValue(row, "transport_allowance_amount")) +
    Number(effectiveValue(row, "adjustments_amount"));

  const absencePenalty = Number(breakdown.absence_penalty_total || 0);
  const unpaidLeaveDeduction = Number(breakdown.unpaid_leave_deduction_amount || 0);
  const latePenalty = Number(breakdown.late_penalty_total || 0);
  const manualDeductionTotal = manualDeductionAdjustments.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );

  const overtimeHours = Number(breakdown.overtime_hours || 0);
  const overtimeRate = Number(breakdown.overtime_hourly_rate || 0);
  const otMultiplier = Number(breakdown.ot_multiplier || 2);
  const otDivisorDays = Number(breakdown.ot_divisor_days || 26);
  const otWorkdayHours = Number(breakdown.ot_workday_hours || 8);

  const overtimeSources = [
    Number(breakdown.overtime_hours_from_attendance_logs || 0) > 0
      ? `Attendance logs ${formatHours(breakdown.overtime_hours_from_attendance_logs)}`
      : null,
    Number(breakdown.overtime_hours_from_attendance || 0) > 0
      ? `Processed attendance ${formatHours(breakdown.overtime_hours_from_attendance)}`
      : null,
    Number(breakdown.overtime_hours_manual || 0) > 0
      ? `Manual OT ${formatHours(breakdown.overtime_hours_manual)}`
      : null,
  ].filter(Boolean);

  if (!breakdown.period_start && !breakdown.period_end && !adjustments.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        Detailed breakdown is not available for this row. Regenerate payroll to refresh calculation
        details.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1}
      >
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>
            Payroll calculation detail
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {row.staff?.name || "Staff"} ·{" "}
            {breakdown.period_start && breakdown.period_end
              ? `${formatHumanDate(breakdown.period_start)} – ${formatHumanDate(breakdown.period_end)}`
              : "Pay period not recorded"}
          </Typography>
        </Box>
        <Chip
          size="small"
          color={row.status === "finalized" ? "success" : "warning"}
          label={row.status === "finalized" ? "Finalized" : "Draft"}
        />
      </Stack>

      <Grid container spacing={1.5}>
        <Grid item xs={12} lg={6}>
          <BreakdownSection title="Earnings" accent="success.main">
            <BreakdownLine
              label="Base salary"
              detail={
                hasOverride(row, "base_salary")
                  ? "Manual override applied"
                  : "Latest effective salary components for this pay period"
              }
              amount={formatKyats(effectiveValue(row, "base_salary"))}
              tone="positive"
              emphasize
            />
            {!hasOverride(row, "base_salary") ? (
              <Stack spacing={0.25} sx={{ pl: 1, pb: 0.5 }}>
                {SALARY_COMPONENT_LABELS.map(([key, label]) => (
                  <BreakdownLine
                    key={key}
                    label={label}
                    amount={formatKyats(salaryComponents[key] || 0)}
                  />
                ))}
              </Stack>
            ) : null}
            <OverrideNote row={row} field="base_salary" label="Base salary" />

            <Divider sx={{ my: 0.75 }} />

            <BreakdownLine
              label="Overtime"
              detail={
                overtimeHours > 0
                  ? `${formatHours(overtimeHours)} × ${formatKyats(overtimeRate)}/h (${otMultiplier}× rate; ${otDivisorDays} days × ${otWorkdayHours} h)`
                  : "No approved overtime in this period"
              }
              amount={formatKyats(effectiveValue(row, "overtime_amount"))}
              tone="positive"
              emphasize
            />
            {overtimeSources.length ? (
              <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5, display: "block" }}>
                Source priority: {overtimeSources.join(" · ")}
              </Typography>
            ) : null}
            <OverrideNote row={row} field="overtime_amount" label="Overtime" />

            <Divider sx={{ my: 0.75 }} />

            <BreakdownLine
              label="Commission"
              detail={
                commissionAdjustments.length
                  ? `Ledger plus ${commissionAdjustments.length} manual commission adjustment(s)`
                  : "Treatment and package commission for this period"
              }
              amount={formatKyats(effectiveValue(row, "commission_amount"))}
              tone="positive"
              emphasize
            />
            {Number(breakdown.manual_commission_amount || 0) > 0 ? (
              <BreakdownLine
                label="Manual commission component"
                amount={formatKyats(breakdown.manual_commission_amount)}
              />
            ) : null}
            {commissionAdjustments.map((item) => (
              <BreakdownLine
                key={`commission-adj-${item.id}`}
                label={adjustmentLabel(item)}
                detail={`Effective ${formatHumanDate(item.effective_date)}`}
                amount={formatKyats(item.amount)}
              />
            ))}
            <OverrideNote row={row} field="commission_amount" label="Commission" />

            <Divider sx={{ my: 0.75 }} />

            <BreakdownLine
              label="Transport allowance"
              detail="One-time entries plus pro-rated recurring policies for the period"
              amount={formatKyats(effectiveValue(row, "transport_allowance_amount"))}
              tone="positive"
              emphasize
            />
            {(breakdown.allowance_one_time_entries || []).map((item) => (
              <BreakdownLine
                key={`allowance-entry-${item.id}`}
                label={item.type_label || "One-time allowance"}
                detail={`Entry ${formatHumanDate(item.entry_date)}`}
                amount={formatKyats(item.amount)}
              />
            ))}
            {(breakdown.allowance_policies || []).map((item) => (
              <BreakdownLine
                key={`allowance-policy-${item.policy_id}`}
                label={item.type_label || "Recurring allowance"}
                detail={`${item.allowance_type} · ${formatHumanDate(item.overlap_start)} – ${formatHumanDate(item.overlap_end)} · ${item.unit_count} unit(s)`}
                amount={formatKyats(item.prorated_amount)}
              />
            ))}
            <OverrideNote row={row} field="transport_allowance_amount" label="Transport allowance" />

            <Divider sx={{ my: 0.75 }} />

            <BreakdownLine
              label="Variable pay adjustments"
              detail={
                earningAdjustments.length
                  ? `${earningAdjustments.length} bonus or reward line(s)`
                  : "No bonus, reward, or increment adjustments"
              }
              amount={formatKyats(effectiveValue(row, "adjustments_amount"))}
              tone="positive"
              emphasize
            />
            {earningAdjustments.map((item) => (
              <BreakdownLine
                key={`earning-adj-${item.id}`}
                label={adjustmentLabel(item)}
                detail={`Effective ${formatHumanDate(item.effective_date)}`}
                amount={formatKyats(item.amount)}
              />
            ))}
            <OverrideNote row={row} field="adjustments_amount" label="Adjustments" />
          </BreakdownSection>
        </Grid>

        <Grid item xs={12} lg={6}>
          <BreakdownSection title="Deductions" accent="error.main">
            <BreakdownLine
              label="Manual deductions"
              detail={
                manualDeductionAdjustments.length
                  ? `${manualDeductionAdjustments.length} fine or deduction line(s)`
                  : "No manual fine or deduction adjustments"
              }
              amount={formatKyats(manualDeductionTotal)}
              tone="deduction"
              emphasize
            />
            {manualDeductionAdjustments.map((item) => (
              <BreakdownLine
                key={`ded-adj-${item.id}`}
                label={adjustmentLabel(item)}
                detail={`Effective ${formatHumanDate(item.effective_date)}`}
                amount={formatKyats(item.amount)}
                tone="deduction"
              />
            ))}

            <Divider sx={{ my: 0.75 }} />

            <BreakdownLine
              label="Absence penalty"
              detail={
                Number(breakdown.penalized_absent_days_count || 0) > 0
                  ? `${breakdown.penalized_absent_days_count} penalized day(s) × ${formatKyats(breakdown.absence_penalty_per_day || 0)} (${breakdown.absence_penalty_multiplier || 3}× daily salary)`
                  : Number(breakdown.exempt_absent_days_count || 0) > 0
                    ? `${breakdown.exempt_absent_days_count} absent day(s) covered by approved leave`
                    : "No penalized absence days"
              }
              amount={formatKyats(absencePenalty)}
              tone="deduction"
              emphasize
            />
            {Number(breakdown.required_workdays_count || 0) > 0 ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Required workdays {breakdown.required_workdays_count} · Attendance recorded{" "}
                {breakdown.attendance_days_count ?? 0} · Public holidays excluded{" "}
                {breakdown.public_holiday_count_excluded ?? 0}
              </Typography>
            ) : null}
            {Array.isArray(breakdown.penalized_absent_dates) &&
            breakdown.penalized_absent_dates.length ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Penalized dates: {formatDateList(breakdown.penalized_absent_dates)}
              </Typography>
            ) : null}

            <Divider sx={{ my: 0.75 }} />

            <BreakdownLine
              label="Unpaid leave"
              detail={
                Number(breakdown.unpaid_leave_days || 0) > 0
                  ? `${breakdown.unpaid_leave_days} unpaid day(s) at daily salary ${formatKyats(breakdown.daily_salary_amount || 0)}`
                  : "No unpaid leave in this period"
              }
              amount={formatKyats(unpaidLeaveDeduction)}
              tone="deduction"
              emphasize
            />
            {Array.isArray(breakdown.unpaid_leave_dates) && breakdown.unpaid_leave_dates.length ? (
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Unpaid leave dates: {formatDateList(breakdown.unpaid_leave_dates)}
              </Typography>
            ) : null}

            <Divider sx={{ my: 0.75 }} />

            <BreakdownLine
              label="Late attendance"
              detail={
                breakdown.late_policy_enabled === false
                  ? "Late policy disabled"
                  : Number(breakdown.late_total_minutes || 0) > 0
                    ? `${formatMinutes(breakdown.late_total_minutes)} approved late · ${formatMinutes(breakdown.late_chargeable_minutes || 0)} chargeable`
                    : "No approved late minutes"
              }
              amount={formatKyats(latePenalty)}
              tone="deduction"
              emphasize
            />
            {Number(breakdown.late_daily_half_day_count || 0) > 0 ? (
              <BreakdownLine
                label="Daily half-day deductions"
                detail={formatDateList(breakdown.late_daily_half_day_dates)}
                amount={formatKyats(breakdown.late_daily_half_day_amount || 0)}
                tone="deduction"
              />
            ) : null}
            {Number(breakdown.late_monthly_half_day_count || 0) > 0 ? (
              <BreakdownLine
                label="Monthly half-day deduction"
                detail={`Pool ${formatMinutes(breakdown.late_minute_pool_minutes || 0)}`}
                amount={formatKyats(breakdown.late_monthly_half_day_amount || 0)}
                tone="deduction"
              />
            ) : null}
            {Number(breakdown.late_chargeable_minutes || 0) > 0 ? (
              <BreakdownLine
                label="Late minute charge"
                detail={`${formatMinutes(breakdown.late_chargeable_minutes)} × ${formatKyats(breakdown.late_minute_rate || 0)}/min`}
                amount={formatKyats(breakdown.late_minute_penalty_amount || 0)}
                tone="deduction"
              />
            ) : null}

            {lateEntries.length ? (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Late attendance log
                </Typography>
                <Table size="small" sx={{ mt: 0.5 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Late</TableCell>
                      <TableCell>Type</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lateEntries.map((entry) => (
                      <TableRow key={`late-${entry.attendance_log_id}-${entry.shift_date}`}>
                        <TableCell>{formatHumanDate(entry.shift_date)}</TableCell>
                        <TableCell>{formatMinutes(entry.late_minutes)}</TableCell>
                        <TableCell>
                          {entry.deduction_type === "daily_half_day"
                            ? "Daily half day"
                            : "Minute pool"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            ) : null}

            <OverrideNote row={row} field="deductions" label="Deductions bucket" />
          </BreakdownSection>
        </Grid>
      </Grid>

      <Box
        sx={{
          p: 1.5,
          borderRadius: 1.5,
          border: 1,
          borderColor: "divider",
          bgcolor: "action.hover",
        }}
      >
        <Grid container spacing={1}>
          <Grid item xs={12} sm={4}>
            <BreakdownLine
              label="Total earnings"
              amount={formatKyats(earningsTotal)}
              tone="positive"
              emphasize
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <BreakdownLine
              label="Total deductions"
              amount={formatKyats(effectiveValue(row, "deductions"))}
              tone="deduction"
              emphasize
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <BreakdownLine
              label="Net pay"
              amount={formatKyats(row.total_amount)}
              emphasize
            />
          </Grid>
        </Grid>
      </Box>
    </Stack>
  );
}
