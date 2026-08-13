import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { Link } from "react-router-dom";
import HrPageShell from "./components/HrPageShell";
import {
  finalizePayroll,
  generatePayroll,
  getPayrolls,
} from "../../services/hrService";
import useToastStore from "../../stores/toastStore";
import { resolveApiError } from "../../services/apiClient";
import { formatKyats } from "../../utils/formatKyats";

export default function HrPayrollPage() {
  const { pushToast } = useToastStore();
  const [payrollRows, setPayrollRows] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [generating, setGenerating] = useState(false);

  const load = async (monthKey = month) => {
    const payrollRes = await getPayrolls({ month: monthKey });
    setPayrollRows(payrollRes.data || []);
  };

  useEffect(() => {
    load(month).catch((error) => {
      pushToast({
        message: resolveApiError(error, "Failed to load payroll data."),
        severity: "error",
      });
    });
  }, [month, pushToast]);

  const payrollForMonth = useMemo(
    () => payrollRows.filter((row) => String(row.month) === String(month)),
    [payrollRows, month],
  );

  const hasDraftForMonth = payrollForMonth.some((row) => row.status !== "finalized");
  const showImportReadyHint = !payrollForMonth.length;
  const missingSalaryRows = useMemo(
    () => payrollForMonth.filter((row) => !Number(row.base_salary)),
    [payrollForMonth],
  );

  const handleGeneratePayroll = async () => {
    setGenerating(true);
    try {
      const result = await generatePayroll({ month });
      const count = Number(result?.generated ?? 0);
      const missingSalary = Number(result?.missing_salary_count ?? 0);

      if (count === 0) {
        pushToast({
          message:
            "No payroll rows were created. Import and process attendance for this month, or add base salary on staff profiles.",
          severity: "warning",
        });
      } else {
        const salaryNote =
          missingSalary > 0
            ? ` ${missingSalary} staff have no base salary set (shown as 0).`
            : "";
        pushToast({
          message: `Payroll draft generated for ${count} staff.${salaryNote}`,
          severity: missingSalary > 0 ? "warning" : "success",
        });
      }
      await load(month);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to generate payroll."),
        severity: "error",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleFinalize = async (id) => {
    try {
      await finalizePayroll(id);
      pushToast({ message: "Payroll finalized.", severity: "success" });
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to finalize payroll."),
        severity: "error",
      });
    }
  };

  const latestGeneratedMonth = useMemo(() => {
    if (!payrollRows.length) return "-";
    const latest = [...payrollRows].sort(
      (a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0),
    )[0];
    return latest?.month || "-";
  }, [payrollRows]);

  return (
    <HrPageShell
      title="HR Module"
      subtitle="Payroll generation and finalization"
      guide={[
        "Monthly payroll = base salary + overtime + commission − deductions = net pay.",
        "Review each line, then Finalize to lock it — finalized rows can no longer be edited.",
        "Overtime and commission are pulled from the attendance and treatment records.",
      ]}
    >
      <Stack spacing={2}>
        <Card variant="outlined" sx={{ p: 2 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
          >
            <Box>
              <Typography variant="h6">Payroll Generation</Typography>
              <Typography variant="body2" color="text.secondary">
                Draft payroll auto-recalculates when attendance/overtime/commission source data changes.
              </Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                type="month"
                size="small"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
              <Button variant="contained" onClick={handleGeneratePayroll} disabled={generating}>
                {generating ? "Generating..." : "Generate Payroll"}
              </Button>
            </Stack>
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 1.5 }}>
            <Chip size="small" color="info" label={`Last Generated Month: ${latestGeneratedMonth}`} />
            <Chip size="small" label={`Rows in ${month}: ${payrollForMonth.length}`} />
            {hasDraftForMonth ? (
              <Chip size="small" color="warning" variant="outlined" label="Draft payroll exists for this month" />
            ) : null}
          </Stack>
          {showImportReadyHint ? (
            <Alert severity="info" sx={{ mt: 1.5 }}>
              After month-end attendance import on{" "}
              <Link to="/hr/daily/attendance">Attendance</Link>, select the same month as the import
              period (e.g. 2026-05) above and click Generate Payroll. Staff need a base salary on their{" "}
              <Link to="/hr/staff">staff profile</Link> for non-zero pay; attendance-only staff
              still appear as drafts with 0 base until salary is set.
            </Alert>
          ) : null}
          {missingSalaryRows.length ? (
            <Alert severity="warning" sx={{ mt: 1.5 }}>
              {missingSalaryRows.length} draft row(s) have no base salary. Open the staff profile and add
              salary, then generate again to recalculate.
            </Alert>
          ) : null}
        </Card>

        <Card variant="outlined" sx={{ p: 2 }}>
          {!payrollForMonth.length ? (
            <Typography color="text.secondary">
              No payroll draft for {month}. Click Generate Payroll to create.
            </Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Staff</TableCell>
                    <TableCell align="right">Base Salary</TableCell>
                    <TableCell align="right">Overtime</TableCell>
                    <TableCell align="right">Commission</TableCell>
                    <TableCell align="right">Deductions</TableCell>
                    <TableCell align="right">Net Pay</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payrollForMonth.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.staff?.name || "-"}</TableCell>
                      <TableCell align="right">{formatKyats(row.base_salary)}</TableCell>
                      <TableCell align="right">{formatKyats(row.overtime_amount)}</TableCell>
                      <TableCell align="right">{formatKyats(row.commission_amount)}</TableCell>
                      <TableCell align="right">{formatKyats(row.deductions)}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {formatKyats(row.total_amount)}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={row.status === "finalized" ? "success" : "warning"}
                          label={row.status === "finalized" ? "Finalized" : "Draft"}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {row.status !== "finalized" ? (
                          <Button size="small" onClick={() => handleFinalize(row.id)}>
                            Finalize
                          </Button>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Locked
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </Stack>
    </HrPageShell>
  );
}
