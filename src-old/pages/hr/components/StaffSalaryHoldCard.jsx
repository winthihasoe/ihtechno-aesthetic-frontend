import {
  Alert,
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
import { Link as RouterLink } from "react-router-dom";
import { formatKyats } from "../../../utils/formatKyats";

const holdModeLabel = (mode) =>
  mode === "fixed_monthly" ? "Fixed monthly" : "Full net pay";

export default function StaffSalaryHoldCard({
  activeHold = null,
  holdRows = [],
  onEditHold,
  onOpenReleaseHold,
  onCreateHold,
  formatHrDate,
  formatHrDateTime,
}) {
  const latestReleasedHold = holdRows.find((row) => row.status === "released") || null;

  return (
    <Stack spacing={1.25}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="subtitle1" fontWeight={700}>
          Salary hold
        </Typography>
        <Chip
          size="small"
          color={activeHold ? "warning" : latestReleasedHold ? "success" : "default"}
          label={activeHold ? "On hold" : latestReleasedHold ? "Released" : "None"}
        />
      </Stack>

      {activeHold ? (
        <>
          <Typography variant="body2" color="text.secondary">
            Mode: {holdModeLabel(activeHold.hold_mode)}
            {activeHold.hold_mode === "fixed_monthly"
              ? ` — ${formatKyats(activeHold.monthly_amount)} / month`
              : ""}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Reason: {activeHold.reason}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Held since: {formatHrDate(activeHold.held_since)}
          </Typography>
          {activeHold.expected_release_date ? (
            <Typography variant="caption" color="text.secondary" display="block">
              Expected release: {formatHrDate(activeHold.expected_release_date)}
            </Typography>
          ) : null}
          <Typography variant="caption" color="text.secondary" display="block">
            Withheld total: {formatKyats(activeHold.total_withheld)}
          </Typography>
          {activeHold.applied_for_month === false ? (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              Not yet applied for the current payroll month. Use{" "}
              <Typography
                component={RouterLink}
                to="/hr/salary-holds"
                variant="caption"
                sx={{ fontWeight: 700, color: "inherit" }}
              >
                Salary holds
              </Typography>{" "}
              to apply a deduction, then regenerate payroll.
            </Alert>
          ) : null}
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Button size="small" variant="outlined" onClick={onEditHold}>
              Edit details
            </Button>
            <Button
              size="small"
              variant="contained"
              color="warning"
              onClick={onOpenReleaseHold}
            >
              Release hold
            </Button>
          </Stack>
        </>
      ) : latestReleasedHold ? (
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            No active salary hold. The most recent record was released and is kept
            below for reference.
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Released: {formatHrDateTime(latestReleasedHold.released_at)}
            {latestReleasedHold.releaser?.name
              ? ` by ${latestReleasedHold.releaser.name}`
              : ""}
          </Typography>
          {latestReleasedHold.release_note ? (
            <Typography variant="caption" color="text.secondary" display="block">
              Note: {latestReleasedHold.release_note}
            </Typography>
          ) : null}
          <Button size="small" variant="outlined" onClick={onCreateHold}>
            Place new hold
          </Button>
        </Stack>
      ) : (
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            No salary hold on file. Place a hold when net pay should be withheld
            until a discipline or repayment matter is resolved.
          </Typography>
          <Button size="small" variant="contained" onClick={onCreateHold}>
            Place hold
          </Button>
        </Stack>
      )}

      <Divider />
      <Typography variant="subtitle2">Hold history</Typography>
      {!holdRows.length ? (
        <Typography variant="body2" color="text.secondary">
          No salary hold history yet.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Mode</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Held</TableCell>
                <TableCell align="right">Withheld</TableCell>
                <TableCell>Released</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {holdRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{holdModeLabel(row.hold_mode)}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>{formatHrDate(row.held_since)}</TableCell>
                  <TableCell align="right">{formatKyats(row.total_withheld)}</TableCell>
                  <TableCell>
                    {row.released_at ? formatHrDateTime(row.released_at) : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Stack>
  );
}
