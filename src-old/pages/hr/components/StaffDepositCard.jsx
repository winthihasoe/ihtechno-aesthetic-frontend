import {
  Alert,
  Box,
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

function DepositCorrectionChanges({ row, formatHrDate }) {
  const changes = [];

  if (row.previous_amount != null || row.new_amount != null) {
    changes.push({
      label: "Amount",
      previous: formatKyats(row.previous_amount),
      next: formatKyats(row.new_amount),
    });
  }

  if (row.previous_held_since || row.new_held_since) {
    changes.push({
      label: "Held date",
      previous: formatHrDate(row.previous_held_since),
      next: formatHrDate(row.new_held_since),
    });
  }

  if (
    row.previous_scheduled_release_date ||
    row.new_scheduled_release_date
  ) {
    changes.push({
      label: "Scheduled release",
      previous: formatHrDate(row.previous_scheduled_release_date),
      next: formatHrDate(row.new_scheduled_release_date),
    });
  }

  if (!changes.length) return "—";

  return (
    <Stack spacing={0.5}>
      {changes.map((change) => (
        <Typography key={change.label} variant="caption" display="block">
          <strong>{change.label}:</strong> {change.previous} {"->"} {change.next}
        </Typography>
      ))}
    </Stack>
  );
}

export default function StaffDepositCard({
  heldDeposit = null,
  latestReleasedDeposit = null,
  depositRows = [],
  depositAmountCorrections = [],
  depositReleaseDue = false,
  onEditDepositDetails,
  onOpenReleaseDeposit,
  onCreateDeposit,
  formatHrDate,
  formatHrDateTime,
}) {
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
          Security deposit
        </Typography>
        <Chip
          size="small"
          color={
            heldDeposit
              ? "warning"
              : latestReleasedDeposit
                ? "success"
                : "default"
          }
          label={
            heldDeposit ? "Held" : latestReleasedDeposit ? "Released" : "None"
          }
        />
      </Stack>
      {heldDeposit ? (
        <>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            flexWrap="wrap"
          >
            <Typography variant="body2" color="text.secondary">
              Amount: {formatKyats(heldDeposit.amount)}
            </Typography>
            <Button size="small" variant="outlined" onClick={onEditDepositDetails}>
              Edit details
            </Button>
          </Stack>
          <Typography variant="caption" color="text.secondary" display="block">
            Held since: {formatHrDate(heldDeposit.held_since)}
          </Typography>
          {heldDeposit.suggested_release_date ? (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Suggested release:{" "}
              {formatHrDate(heldDeposit.suggested_release_date)}
            </Typography>
          ) : null}
          {heldDeposit.scheduled_release_date ? (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Scheduled release:{" "}
              {formatHrDate(heldDeposit.scheduled_release_date)}
            </Typography>
          ) : null}
          <Button
            size="small"
            variant="contained"
            onClick={onOpenReleaseDeposit}
            sx={{ alignSelf: "flex-start" }}
          >
            Release deposit
          </Button>
        </>
      ) : latestReleasedDeposit ? (
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            No deposit is currently held. The most recent record was released
            and is kept below for reference.
          </Typography>
          <Stack spacing={0.75}>
            <Typography variant="body2">
              Amount: {formatKyats(latestReleasedDeposit.amount)}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Held since: {formatHrDate(latestReleasedDeposit.held_since)}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Released: {formatHrDateTime(latestReleasedDeposit.released_at)}
              {latestReleasedDeposit.releaser?.name
                ? ` by ${latestReleasedDeposit.releaser.name}`
                : ""}
            </Typography>
            {latestReleasedDeposit.release_note ? (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Note: {latestReleasedDeposit.release_note}
              </Typography>
            ) : null}
            {latestReleasedDeposit.release_signature ? (
              <>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Signature:
                </Typography>
                <Box
                  component="img"
                  src={latestReleasedDeposit.release_signature}
                  alt="Release signature"
                  sx={{
                    bgcolor: "background.paper",
                    maxWidth: 200,
                    maxHeight: 80,
                    objectFit: "contain",
                    borderRadius: 1,
                  }}
                />
              </>
            ) : null}
          </Stack>
          <Button size="small" variant="outlined" onClick={onCreateDeposit}>
            Record new deposit
          </Button>
        </Stack>
      ) : (
        <Stack spacing={1}>
          <Typography variant="body2" color="text.secondary">
            No deposit on file. Record a security deposit if the clinic is
            holding funds from this staff member.
          </Typography>
          <Button size="small" variant="contained" onClick={onCreateDeposit}>
            Add deposit
          </Button>
        </Stack>
      )}
      {depositAmountCorrections.length > 0 ? (
        <>
          <Divider />
          <Typography variant="subtitle2">Detail edit history</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Changes</TableCell>
                  <TableCell>By</TableCell>
                  <TableCell>Note</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {depositAmountCorrections.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{formatHrDateTime(row.created_at)}</TableCell>
                    <TableCell>
                      <DepositCorrectionChanges
                        row={row}
                        formatHrDate={formatHrDate}
                      />
                    </TableCell>
                    <TableCell>{row.corrector?.name || "—"}</TableCell>
                    <TableCell>{row.note || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      ) : null}
      {depositReleaseDue ? (
        <Alert severity="info" sx={{ py: 0.5 }}>
          Probation or suggested release date has passed. Consider releasing the
          deposit with staff e-sign.
        </Alert>
      ) : null}
      <Divider />
      <Typography variant="subtitle2">Deposit history</Typography>
      {!depositRows.length ? (
        <Typography variant="body2" color="text.secondary">
          No deposit history yet.
        </Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Held</TableCell>
                <TableCell>Released</TableCell>
                <TableCell>Signature</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {depositRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell align="right">{formatKyats(row.amount)}</TableCell>
                  <TableCell>
                    {row.status === "held" ? "Held" : "Released"}
                  </TableCell>
                  <TableCell>{formatHrDate(row.held_since)}</TableCell>
                  <TableCell>
                    {row.released_at ? formatHrDateTime(row.released_at) : "-"}
                  </TableCell>
                  <TableCell>
                    {row.release_signature ? (
                      <Box
                        component="img"
                        src={row.release_signature}
                        alt="Release signature"
                        sx={{ width: 72, height: 32, objectFit: "contain" }}
                      />
                    ) : (
                      "-"
                    )}
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
