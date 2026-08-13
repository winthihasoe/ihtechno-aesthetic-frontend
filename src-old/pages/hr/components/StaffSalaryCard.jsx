import {
  Button,
  Chip,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { formatKyats } from "../../../utils/formatKyats";

const salaryComponents = [
  { key: "basic_salary", label: "Basic" },
  { key: "basic_increase", label: "Basic Increase" },
  { key: "yearly_increase", label: "Yearly Increase" },
  { key: "license_amount", label: "License" },
  { key: "probation_increase", label: "Probation" },
];

export default function StaffSalaryCard({
  activeSalary = null,
  salaryRows = [],
  onEditCurrentSalary,
  onPromoteSalary,
  formatDate,
}) {
  return (
    <Stack spacing={1.25}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle1" fontWeight={700}>
          Salary
        </Typography>
        <Chip
          size="small"
          color={activeSalary ? "success" : "default"}
          label={activeSalary ? "Active Salary" : "No Salary"}
        />
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Active total salary:{" "}
        {activeSalary ? formatKyats(activeSalary.base_salary) : "Not set"}
      </Typography>
      {activeSalary ? (
        <Stack direction="row" flexWrap="wrap" gap={0.75}>
          {salaryComponents.map((component) => (
            <Chip
              key={component.key}
              size="small"
              variant="outlined"
              label={`${component.label}: ${formatKyats(activeSalary[component.key] || 0)}`}
            />
          ))}
        </Stack>
      ) : null}
      <Typography variant="caption" color="text.secondary">
        Effective from:{" "}
        {activeSalary ? formatDate(activeSalary.effective_from) : "-"}
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        <Button
          size="small"
          variant="outlined"
          disabled={!activeSalary}
          onClick={onEditCurrentSalary}
        >
          Edit Current Salary
        </Button>
        <Button size="small" variant="contained" onClick={onPromoteSalary}>
          Promote Salary
        </Button>
      </Stack>
      <Divider />
      <Typography variant="subtitle2">Salary History (Read-only)</Typography>
      {!salaryRows.length ? (
        <Typography variant="body2" color="text.secondary">
          No salary history yet.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell align="right">Total Salary</TableCell>
                <TableCell align="right">Basic</TableCell>
                <TableCell align="right">Increases</TableCell>
                <TableCell align="right">Allowances</TableCell>
                <TableCell>Effective From</TableCell>
                <TableCell>Created At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {salaryRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell align="right">
                    {formatKyats(row.base_salary)}
                  </TableCell>
                  <TableCell align="right">
                    {formatKyats(row.basic_salary ?? row.base_salary)}
                  </TableCell>
                  <TableCell align="right">
                    {formatKyats(
                      Number(row.basic_increase || 0) +
                        Number(row.yearly_increase || 0) +
                        Number(row.probation_increase || 0),
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {formatKyats(row.license_amount || 0)}
                  </TableCell>
                  <TableCell>{formatDate(row.effective_from)}</TableCell>
                  <TableCell>{formatDate(row.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
