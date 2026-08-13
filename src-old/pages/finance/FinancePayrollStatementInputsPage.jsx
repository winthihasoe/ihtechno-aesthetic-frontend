import { useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import dayjs from "dayjs";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import PeopleOutlinedIcon from "@mui/icons-material/PeopleOutlined";
import {
  Box,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import GuidedEmptyState from "../../components/common/GuidedEmptyState";
import { getPayrollFinanceYearSummary } from "../../services/financeService";
import { formatKyats } from "../../utils/formatKyats";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import useAuthStore from "../../stores/authStore";
import { resolveUserPrimaryRole } from "../../utils/workspaceRoutes";
import {
  FinancePageHeader,
  FinancePanel,
  FinancePanelHeader,
  FinancePanelTable,
  formatMonthLabel,
  useFinanceTokens,
} from "../../components/finance";

const EMPTY_STEPS = [
  {
    icon: PeopleOutlinedIcon,
    title: "HR generates payroll",
    body: "Each month, HR builds payroll from staff salaries, attendance, and compensation rules.",
  },
  {
    icon: CheckCircleOutlinedIcon,
    title: "HR finalizes and completes payout",
    body: "After all rows are finalized and salaries are transferred outside the system, HR queues the month total.",
  },
  {
    icon: PaymentsOutlinedIcon,
    title: "Finance posts in Transactions",
    body: "Post the payroll accrual first, then the payroll payment, to recognize expense and clear Salaries Payable.",
  },
];

function postingStatusLabel(status) {
  if (status === "posted") return "Posted";
  if (status === "reversed") return "Reversed";
  if (status === "pending") return "Pending";
  if (status === "none") return "—";
  return status;
}

function postingStatusColor(status) {
  if (status === "posted") return "success.main";
  if (status === "reversed") return "warning.main";
  if (status === "pending") return "info.main";
  return "text.secondary";
}

function hrStatusLabel(status) {
  if (status === "payout_queued") return "Payout queued";
  if (status === "finalized") return "Finalized";
  if (status === "draft") return "Draft";
  if (status === "none") return "No payroll";
  return status;
}

function currentYear() {
  return dayjs().year();
}

export default function FinancePayrollStatementInputsPage() {
  const { user } = useAuthStore();
  const role = resolveUserPrimaryRole(user);
  const rolePrefix = `/${role}`;
  const { pushToast } = useToastStore();
  const { compactTableSx, compactFieldSx, financeToolbarSx } = useFinanceTokens();

  const [year, setYear] = useState(currentYear());
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const yearOptions = useMemo(() => {
    const current = currentYear();
    return Array.from({ length: 6 }, (_item, index) => current - index);
  }, []);

  const loadSummary = useCallback(
    async (yearValue = year) => {
      setLoading(true);
      try {
        const res = await getPayrollFinanceYearSummary(yearValue);
        setSummary(res?.data || null);
      } catch (error) {
        pushToast({
          message: resolveApiError(error, "Failed to load payroll year summary."),
          severity: "error",
        });
        setSummary(null);
      } finally {
        setLoading(false);
      }
    },
    [pushToast, year],
  );

  useEffect(() => {
    loadSummary(year);
  }, [year, loadSummary]);

  const months = summary?.months || [];
  const activeMonths = useMemo(
    () => months.filter((row) => row.hr_status !== "none"),
    [months],
  );

  const yearTotals = useMemo(
    () =>
      months.reduce(
        (acc, row) => ({
          net_payable_total: acc.net_payable_total + Number(row.net_payable_total || 0),
          paid_amount: acc.paid_amount + Number(row.paid_amount || 0),
        }),
        { net_payable_total: 0, paid_amount: 0 },
      ),
    [months],
  );

  const toolbarStats = [
    { label: "Months with payroll", value: activeMonths.length },
    {
      label: "Year net total",
      value: formatKyats(yearTotals.net_payable_total),
      accent: yearTotals.net_payable_total > 0 ? "success.main" : undefined,
    },
    {
      label: "Posted paid",
      value: formatKyats(yearTotals.paid_amount),
      accent: yearTotals.paid_amount > 0 ? "success.main" : undefined,
    },
  ];

  return (
    <Box sx={{ pb: 3 }}>
      <FinancePanel>
        <FinancePanelHeader>
          <FinancePageHeader
            title="Payroll Statement Inputs"
            subtitle="Read-only month-by-month payroll totals and posting status for the reporting year."
          />
        </FinancePanelHeader>

        <Box
          sx={{
            ...financeToolbarSx,
            px: { xs: 2, sm: 3 },
            py: 1.5,
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center">
            <TextField
              select
              size="small"
              label="Reporting year"
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              sx={{ ...compactFieldSx, minWidth: 160 }}
            >
              {yearOptions.map((optionYear) => (
                <MenuItem key={optionYear} value={optionYear}>
                  {optionYear}
                </MenuItem>
              ))}
            </TextField>
            <Typography variant="body2" color="text.secondary">
              Payroll totals by month — no per-staff detail.
            </Typography>
          </Stack>

          <Stack direction="row" spacing={2} flexWrap="wrap">
            {toolbarStats.map((stat) => (
              <Box key={stat.label}>
                <Typography variant="caption" color="text.secondary" display="block">
                  {stat.label}
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={700}
                  color={stat.accent || "text.primary"}
                >
                  {stat.value}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <LoadingIndicator size={112} />
          </Box>
        ) : !activeMonths.length ? (
          <Box sx={{ px: { xs: 2, sm: 3 }, pb: 3 }}>
            <GuidedEmptyState
              icon={PaymentsOutlinedIcon}
              title={`No payroll activity for ${year}`}
              description="This page lists finalized payroll totals month by month. Generate and finalize payroll in HR, then complete payout to queue accounting entries."
              steps={EMPTY_STEPS}
              footer={
                <>
                  Manage payroll in{" "}
                  <Typography
                    component={RouterLink}
                    to={`${rolePrefix}/hr/payroll`}
                    variant="body2"
                    sx={{
                      color: "primary.main",
                      fontWeight: 600,
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    HR → Payroll
                  </Typography>
                  .
                </>
              }
            />
          </Box>
        ) : (
          <FinancePanelTable>
            <Table size="small" sx={compactTableSx}>
              <TableHead>
                <TableRow>
                  <TableCell>Month</TableCell>
                  <TableCell align="right">Staff</TableCell>
                  <TableCell align="right">Net total</TableCell>
                  <TableCell>HR status</TableCell>
                  <TableCell>Accrual</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell align="right">Paid</TableCell>
                  <TableCell align="right">Remaining</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {months.map((row) => {
                  const hasActivity = row.hr_status !== "none";
                  return (
                    <TableRow
                      key={row.month}
                      hover={hasActivity}
                      sx={hasActivity ? undefined : { opacity: 0.55 }}
                    >
                      <TableCell>{formatMonthLabel(row.month)}</TableCell>
                      <TableCell align="right">
                        {hasActivity ? row.staff_count : "—"}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: hasActivity ? 600 : 400 }}>
                        {hasActivity ? formatKyats(row.net_payable_total) : "—"}
                      </TableCell>
                      <TableCell>{hrStatusLabel(row.hr_status)}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color={postingStatusColor(row.accrual_status)}
                        >
                          {postingStatusLabel(row.accrual_status)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          color={postingStatusColor(row.payment_status)}
                        >
                          {postingStatusLabel(row.payment_status)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {hasActivity ? formatKyats(row.paid_amount) : "—"}
                      </TableCell>
                      <TableCell align="right">
                        {hasActivity ? formatKyats(row.remaining_payable) : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Year total</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    —
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: "success.main" }}>
                    {formatKyats(yearTotals.net_payable_total)}
                  </TableCell>
                  <TableCell colSpan={3} />
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    {formatKyats(yearTotals.paid_amount)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </FinancePanelTable>
        )}
      </FinancePanel>
    </Box>
  );
}
