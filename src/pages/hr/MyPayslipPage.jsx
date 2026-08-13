import { useMemo, useState } from "react";
import {
  Box,
  Chip,
  Divider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import useAuthStore from "../../stores/authStore";
import useSettingsStore from "../../stores/settingsStore";
import { formatKyats } from "../../utils/formatKyats";
import HrPageShell from "./components/HrPageShell";

const SAMPLE_MONTH_COUNT = 6;

function monthSeed(monthKey) {
  return [...monthKey].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
}

function shiftMonth(date, offset) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

function toMonthKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMonthShort(monthKey) {
  return new Date(`${monthKey}-01`).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

function formatMonthLong(monthKey) {
  return new Date(`${monthKey}-01`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function buildSamplePayslip(monthKey) {
  const seed = monthSeed(monthKey);
  const baseSalary = 850_000;
  const overtime = 40_000 + (seed % 5) * 8_000;
  const commission = 25_000 + (seed % 7) * 5_000;
  const allowance = 20_000 + (seed % 3) * 5_000;
  const deductions = 15_000 + (seed % 4) * 2_500;
  const workingDays = 22 - (seed % 3);
  const leaveDays = seed % 3;

  return {
    month: monthKey,
    base_salary: baseSalary,
    overtime_amount: overtime,
    commission_amount: commission,
    allowance_amount: allowance,
    deductions,
    working_days: workingDays,
    leave_days: leaveDays,
    attendance_days: workingDays - leaveDays,
    total_amount: baseSalary + overtime + commission + allowance - deductions,
  };
}

function buildSamplePayslips() {
  const previousMonth = shiftMonth(new Date(), -1);
  const months = [];
  for (let i = SAMPLE_MONTH_COUNT - 1; i >= 0; i -= 1) {
    months.push(toMonthKey(shiftMonth(previousMonth, -i)));
  }
  return months.map(buildSamplePayslip);
}

const SAMPLE_PAYSLIPS = buildSamplePayslips();
const DEFAULT_MONTH = SAMPLE_PAYSLIPS[SAMPLE_PAYSLIPS.length - 1]?.month || "";

export default function MyPayslipPage() {
  const theme = useTheme();
  const user = useAuthStore((state) => state.user);
  const clinicName = useSettingsStore(
    (state) => state.settings?.clinic_name || "Beautisoon",
  );
  const [month, setMonth] = useState(DEFAULT_MONTH);

  const selected = useMemo(
    () => SAMPLE_PAYSLIPS.find((row) => row.month === month) || null,
    [month],
  );

  const earningsTotal = selected
    ? selected.base_salary +
      selected.overtime_amount +
      selected.commission_amount +
      selected.allowance_amount
    : 0;

  return (
    <HrPageShell
      title="My Payslip"
      subtitle="Confidential payroll summary for the selected month."
      badge="Sample"
    >
      <Box sx={{ maxWidth: 680, mx: "auto" }}>
        <Box sx={{ mb: 2.5 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              mb: 1,
              fontWeight: 700,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            Pay period
          </Typography>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={month}
            onChange={(_event, next) => {
              if (next) setMonth(next);
            }}
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 0.75,
              "& .MuiToggleButtonGroup-grouped": {
                border: `1px solid ${theme.palette.divider} !important`,
                borderRadius: "6px !important",
                m: 0,
                px: 1.5,
                py: 0.65,
                textTransform: "none",
                fontWeight: 600,
                fontSize: 13,
                color: "text.secondary",
                bgcolor: "background.paper",
                "&.Mui-selected": {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: "primary.main",
                  borderColor: `${theme.palette.primary.main} !important`,
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.16),
                  },
                },
                "&:hover": {
                  bgcolor: "action.hover",
                },
              },
            }}
          >
            {SAMPLE_PAYSLIPS.map((row) => (
              <ToggleButton key={row.month} value={row.month}>
                {formatMonthShort(row.month)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {selected ? (
          <Box
            sx={{
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              overflow: "hidden",
              bgcolor: "background.paper",
              boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.04)}, 0 8px 24px ${alpha(theme.palette.common.black, 0.06)}`,
            }}
          >
            <Box
              sx={{
                px: { xs: 2.5, sm: 3.5 },
                py: 2.75,
                borderBottom: 1,
                borderColor: "divider",
                background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.06)} 0%, ${alpha(theme.palette.primary.main, 0)} 100%)`,
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="flex-start"
                spacing={2}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: 1.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      color: "primary.main",
                      flexShrink: 0,
                    }}
                  >
                    <ReceiptLongOutlinedIcon />
                  </Box>
                  <Box>
                    <Typography
                      variant="overline"
                      sx={{
                        letterSpacing: 1.1,
                        color: "text.secondary",
                        lineHeight: 1.2,
                      }}
                    >
                      {clinicName}
                    </Typography>
                    <Typography variant="h5" fontWeight={800} sx={{ mt: 0.25 }}>
                      Payslip
                    </Typography>
                  </Box>
                </Stack>
                <Chip
                  size="small"
                  color="success"
                  label="Finalized"
                  sx={{ fontWeight: 700 }}
                />
              </Stack>
            </Box>

            <Box sx={{ px: { xs: 2.5, sm: 3.5 }, py: 2.5 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                spacing={2}
                sx={{ mb: 2.5 }}
              >
                <Box>
                  <MetaLabel>Employee</MetaLabel>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {user?.name || "Staff member"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user?.role
                      ? String(user.role).replace(/_/g, " ")
                      : "Clinic staff"}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
                  <MetaLabel>Pay period</MetaLabel>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {formatMonthLong(selected.month)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Attendance {selected.attendance_days} /{" "}
                    {selected.working_days} days
                    {selected.leave_days > 0
                      ? ` · ${selected.leave_days} leave`
                      : ""}
                  </Typography>
                </Box>
              </Stack>

              <Divider sx={{ mb: 2.5 }} />

              <PayslipSection title="Earnings">
                <PayslipRow
                  label="Basic salary"
                  value={formatKyats(selected.base_salary)}
                  emphasize
                />
                <PayslipRow
                  label="Overtime"
                  value={formatKyats(selected.overtime_amount)}
                  tone="positive"
                />
                <PayslipRow
                  label="Commission"
                  value={formatKyats(selected.commission_amount)}
                  tone="positive"
                />
                <PayslipRow
                  label="Allowance"
                  value={formatKyats(selected.allowance_amount)}
                  tone="positive"
                />
                <PayslipRow
                  label="Gross earnings"
                  value={formatKyats(earningsTotal)}
                  emphasize
                />
              </PayslipSection>

              <PayslipSection title="Deductions">
                <PayslipRow
                  label="Deductions"
                  value={formatKyats(selected.deductions)}
                  tone="deduction"
                />
              </PayslipSection>

              <Box
                sx={{
                  mt: 0.5,
                  px: 2,
                  py: 1.75,
                  borderRadius: 1.5,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 2,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  border: 1,
                  borderColor: alpha(theme.palette.primary.main, 0.2),
                }}
              >
                <Box>
                  <Typography variant="subtitle2" fontWeight={800}>
                    Net salary
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Amount payable for this period
                  </Typography>
                </Box>
                <Typography
                  variant="h5"
                  fontWeight={800}
                  color="primary.main"
                  sx={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatKyats(selected.total_amount)}
                </Typography>
              </Box>

              <Divider sx={{ my: 2.5 }} />

              <Box sx={{ textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Issued by Human Resources · For employee records only
                </Typography>
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{ display: "block", mt: 0.5 }}
                >
                  Sample payslip for demonstration — not linked to live payroll
                </Typography>
              </Box>
            </Box>
          </Box>
        ) : null}
      </Box>
    </HrPageShell>
  );
}

function MetaLabel({ children }) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{
        display: "block",
        mb: 0.35,
        fontWeight: 700,
        letterSpacing: 0.45,
        textTransform: "uppercase",
      }}
    >
      {children}
    </Typography>
  );
}

function PayslipSection({ title, children }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography
        variant="caption"
        sx={{
          display: "block",
          mb: 1,
          fontWeight: 800,
          letterSpacing: 0.55,
          textTransform: "uppercase",
          color: "text.secondary",
        }}
      >
        {title}
      </Typography>
      <Box
        sx={{
          border: 1,
          borderColor: "divider",
          borderRadius: 1.5,
          overflow: "hidden",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function PayslipRow({ label, value, emphasize = false, tone = "default" }) {
  const valueColor =
    tone === "positive"
      ? "success.dark"
      : tone === "deduction"
        ? "error.main"
        : "text.primary";

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 2,
        px: 1.75,
        py: 1.15,
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: emphasize ? "action.hover" : "transparent",
        "&:last-child": { borderBottom: 0 },
      }}
    >
      <Typography variant="body2" fontWeight={emphasize ? 700 : 500}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={emphasize ? 700 : 600}
        sx={{
          color: valueColor,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
