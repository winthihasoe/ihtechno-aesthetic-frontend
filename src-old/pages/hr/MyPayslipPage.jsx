import { useEffect, useMemo, useState } from "react";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import { getMyPayrolls } from "../../services/hrService";
import { resolveApiError } from "../../services/apiClient";
import useAuthStore from "../../stores/authStore";
import useToastStore from "../../stores/toastStore";
import { formatKyats } from "../../utils/formatKyats";

const monthKeyFromDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const parseMonthKey = (monthKey) => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1);
};

const addMonths = (monthKey, delta) => {
  const date = parseMonthKey(monthKey);
  date.setMonth(date.getMonth() + delta);
  return monthKeyFromDate(date);
};

const formatMonthLabel = (monthKey) =>
  parseMonthKey(monthKey).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

const formatCount = (value) => {
  if (value === null || value === undefined) return "—";
  const number = Number(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
};

const formatMoneyValue = (value) => {
  if (value === null || value === undefined) return "—";
  return formatKyats(value);
};

const buildEmptyPayslip = (monthKey, user) => ({
  month_label: formatMonthLabel(monthKey),
  period_label: null,
  staff_name: user?.name || "—",
  department: "—",
  basic_salary: null,
  working_days: null,
  leave_days: null,
  total_attendance: null,
  overtime: null,
  performance: null,
  fine: null,
  late_and_early_out: null,
  net_salary: null,
  isPublished: false,
});

export default function MyPayslipPage() {
  const { pushToast } = useToastStore();
  const user = useAuthStore((state) => state.user);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() =>
    monthKeyFromDate(new Date()),
  );

  useEffect(() => {
    setLoading(true);
    getMyPayrolls()
      .then((res) => {
        const payload = Array.isArray(res?.data) ? res.data : [];
        setRows(payload);

        const published = payload
          .filter((row) => Number(row.staff_id) === Number(user?.id))
          .map((row) => String(row.month))
          .sort();

        if (published.length) {
          setSelectedMonth(published[published.length - 1]);
        } else {
          setSelectedMonth(monthKeyFromDate(new Date()));
        }
      })
      .catch((error) => {
        pushToast({
          message: resolveApiError(error, "Failed to load payslips."),
          severity: "error",
        });
        setRows([]);
      })
      .finally(() => setLoading(false));
  }, [pushToast, user?.id]);

  const safeRows = useMemo(() => {
    const viewerId = Number(user?.id);
    if (!viewerId) return [];

    return rows.filter((row) => Number(row.staff_id) === viewerId);
  }, [rows, user?.id]);

  const payslipByMonth = useMemo(() => {
    const map = {};
    safeRows.forEach((row) => {
      map[String(row.month)] = {
        ...row.payslip,
        isPublished: true,
      };
    });
    return map;
  }, [safeRows]);

  const payslip =
    payslipByMonth[selectedMonth] ?? buildEmptyPayslip(selectedMonth, user);

  const hasForeignRows = rows.some(
    (row) => Number(row.staff_id) !== Number(user?.id),
  );

  const goOlder = () => {
    setSelectedMonth((current) => addMonths(current, -1));
  };

  const goNewer = () => {
    setSelectedMonth((current) => addMonths(current, 1));
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 600, mx: "auto" }}>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h5" fontWeight={800}>
            My Payslip
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Confidential. Only your finalized payroll is shown here after HR
            publishes it.
          </Typography>
        </CardContent>
      </Card>

      {hasForeignRows ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          Unexpected payslip data was blocked for your safety. Please contact HR
          if this continues.
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : (
        <PayslipDocument
          payslip={payslip}
          onGoNewer={goNewer}
          onGoOlder={goOlder}
        />
      )}
    </Box>
  );
}

function PayslipDocument({ payslip, onGoNewer, onGoOlder }) {
  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        boxShadow: "0 12px 40px rgba(15, 23, 42, 0.08)",
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: 2.5,
          bgcolor: "primary.main",
          color: "primary.contrastText",
          textAlign: "center",
        }}
      >
        <Typography
          variant="overline"
          sx={{ letterSpacing: 1.2, opacity: 0.9 }}
        >
          Derma Fairy Wellness &amp; Aesthetic Center
        </Typography>
        <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
          Payslip
        </Typography>
      </Box>

      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 2 }}
        >
          <IconButton
            aria-label="Previous month"
            onClick={onGoOlder}
            size="small"
          >
            <ChevronLeftIcon />
          </IconButton>

          <Box sx={{ textAlign: "center", minWidth: 0 }}>
            <Typography variant="h6" fontWeight={700}>
              {payslip.month_label}
            </Typography>
            {payslip.period_label ? (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Pay period: {payslip.period_label}
              </Typography>
            ) : null}
          </Box>

          <IconButton aria-label="Next month" onClick={onGoNewer} size="small">
            <ChevronRightIcon />
          </IconButton>
        </Stack>

        {!payslip.isPublished ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            Payslip not published for this month yet.
          </Alert>
        ) : null}

        <PayslipSection title="Employee Information">
          <PayslipRow label="Month" value={payslip.month_label} />
          <PayslipRow label="Name" value={payslip.staff_name} emphasize />
          <PayslipRow label="Department" value={payslip.department} />
        </PayslipSection>

        <PayslipSection title="Salary Calculation">
          <PayslipRow
            label="Basic Salary"
            value={formatMoneyValue(payslip.basic_salary)}
            emphasize
          />
          <PayslipRow
            label="Working Day"
            value={formatCount(payslip.working_days)}
          />
          <PayslipRow
            label="Leave Day"
            value={formatCount(payslip.leave_days)}
          />
          <PayslipRow
            label="Total Attendance"
            value={formatCount(payslip.total_attendance)}
          />
        </PayslipSection>

        <PayslipSection title="Earnings & Deductions">
          <PayslipRow
            label="Overtime"
            value={formatMoneyValue(payslip.overtime)}
            tone="positive"
          />
          <PayslipRow
            label="Performance"
            value={formatMoneyValue(payslip.performance)}
            detail="Commission, allowance, and bonus lines"
            tone="positive"
          />
          <PayslipRow
            label="Fine"
            value={formatMoneyValue(payslip.fine)}
            tone="deduction"
          />
          <PayslipRow
            label="Late & Early Out"
            value={formatMoneyValue(payslip.late_and_early_out)}
            tone="deduction"
          />
        </PayslipSection>

        <Box
          sx={{
            mt: 2,
            px: 2,
            py: 1.75,
            borderRadius: 1.5,
            bgcolor: payslip.isPublished ? "success.main" : "action.selected",
            color: payslip.isPublished
              ? "success.contrastText"
              : "text.primary",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Typography variant="subtitle1" fontWeight={800}>
            Net Salary
          </Typography>
          <Typography
            variant="h6"
            fontWeight={800}
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatMoneyValue(payslip.net_salary)}
          </Typography>
        </Box>

        <Divider sx={{ my: 2.5 }} />

        <Box sx={{ textAlign: "center", px: { xs: 0, sm: 2 } }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            Note of Appreciation
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Thank you for your commitment and valuable contributions.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Warm Regards,
          </Typography>
          <Typography variant="body2" fontWeight={700}>
            Human Resources Department
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 0.5 }}
          >
            Derma Fairy Wellness &amp; Aesthetic Center
          </Typography>
        </Box>
      </CardContent>
    </Card>
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
          letterSpacing: 0.6,
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
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function PayslipRow({
  label,
  value,
  detail,
  emphasize = false,
  tone = "default",
}) {
  const isEmpty = value === "—";
  const valueColor = isEmpty
    ? "text.secondary"
    : tone === "positive"
      ? "success.main"
      : tone === "deduction"
        ? "error.main"
        : "text.primary";

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: detail ? "flex-start" : "center",
        gap: 2,
        px: 1.5,
        py: 1,
        borderBottom: 1,
        borderColor: "divider",
        "&:last-child": { borderBottom: 0 },
        bgcolor: emphasize ? "action.hover" : "transparent",
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" fontWeight={emphasize ? 700 : 500}>
          {label}
        </Typography>
        {detail ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block" }}
          >
            {detail}
          </Typography>
        ) : null}
      </Box>
      <Typography
        variant="body2"
        fontWeight={emphasize ? 700 : 600}
        sx={{
          color: valueColor,
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
          flexShrink: 0,
          textAlign: "right",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}
