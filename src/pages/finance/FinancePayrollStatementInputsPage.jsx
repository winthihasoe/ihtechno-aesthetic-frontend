import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  Paper,
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
import { getPayrolls } from "../../services/hrService";
import { formatKyats } from "../../utils/formatKyats";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import { FinancePageHeader, useFinanceTokens } from "../../components/finance";

export default function FinancePayrollStatementInputsPage() {
  const { pushToast } = useToastStore();
  const { financeSurfaceSx } = useFinanceTokens();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState([]);

  useEffect(() => {
    getPayrolls()
      .then((res) => setRows(res.data || []))
      .catch((error) => {
        pushToast({
          message: resolveApiError(error, "Failed to load finalized payroll summary."),
          severity: "error",
        });
      });
  }, [pushToast]);

  const finalizedRows = useMemo(
    () =>
      rows.filter(
        (row) => row.status === "finalized" && String(row.month) === String(month),
      ),
    [rows, month],
  );

  const totals = useMemo(
    () =>
      finalizedRows.reduce(
        (acc, row) => {
          acc.total += Number(row.total_amount || 0);
          acc.deductions += Number(row.deductions || 0);
          return acc;
        },
        { total: 0, deductions: 0 },
      ),
    [finalizedRows],
  );

  return (
    <Box sx={{ ...financeSurfaceSx, p: { xs: 2, sm: 3 } }}>
      <FinancePageHeader
        title="Payroll Statement Inputs"
        subtitle="Finance view is read-only and shows finalized payroll values only."
        actions={
          <TextField
            type="month"
            size="small"
            label="Month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        }
      />

      <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} flexWrap="wrap">
          <Chip size="small" label={`Finalized rows: ${finalizedRows.length}`} />
          <Chip size="small" label={`Net paid total: ${formatKyats(totals.total)}`} />
          <Chip size="small" label={`Total deductions: ${formatKyats(totals.deductions)}`} />
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        {!finalizedRows.length ? (
          <Typography color="text.secondary">
            No finalized payroll rows found for {month}.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Month</TableCell>
                  <TableCell>Staff</TableCell>
                  <TableCell align="right">Deductions</TableCell>
                  <TableCell align="right">Net Paid</TableCell>
                  <TableCell>Finalized At</TableCell>
                  <TableCell align="right">Finalized By</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {finalizedRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.month}</TableCell>
                    <TableCell>{row.staff?.name || "-"}</TableCell>
                    <TableCell align="right">{formatKyats(row.deductions)}</TableCell>
                    <TableCell align="right">{formatKyats(row.total_amount)}</TableCell>
                    <TableCell>
                      {row.finalized_at
                        ? new Date(row.finalized_at).toLocaleString("en-GB")
                        : "-"}
                    </TableCell>
                    <TableCell align="right">{row.finalized_by || "-"}</TableCell>
                    <TableCell>
                      <Chip size="small" color="success" label="Finalized" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Box>
  );
}
