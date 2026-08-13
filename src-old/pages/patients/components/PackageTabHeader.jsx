import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Drawer,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { formatKyats } from "../../../utils/formatKyats";

export default function PackageTabHeader({
  storeCreditBalance,
  canSell,
  canViewStoreCredit,
  onSell,
  onViewLedger,
}) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      justifyContent="space-between"
      alignItems={{ xs: "flex-start", sm: "center" }}
      spacing={1}
      sx={{ mb: 2 }}
    >
      <Box>
        <Typography variant="subtitle1" fontWeight={600}>
          Packages
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Prepaid bundles and remaining sessions per treatment line.
        </Typography>
        {canViewStoreCredit && storeCreditBalance > 0 && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
            <Typography variant="body2">
              Store credit balance: {formatKyats(storeCreditBalance)}
            </Typography>
            <Button size="small" onClick={onViewLedger}>
              View ledger
            </Button>
          </Stack>
        )}
      </Box>
      {canSell && (
        <Button variant="contained" onClick={onSell}>
          + Sell package
        </Button>
      )}
    </Stack>
  );
}

export function StoreCreditLedgerDrawer({ open, onClose, entries, balance }) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: 420, p: 2 } }}>
      <Typography variant="h6" gutterBottom>
        Store credit ledger
      </Typography>
      <Chip label={`Balance: ${formatKyats(balance)}`} color="primary" sx={{ mb: 2 }} />
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Source</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(entries || []).map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</TableCell>
              <TableCell>{formatKyats(row.amount)}</TableCell>
              <TableCell>{row.source_label || row.source_type}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Drawer>
  );
}

export function ClosedPackagesExpander({ packages, canCommercials, onUsageHistory }) {
  const [open, setOpen] = useState(false);
  if (!packages.length) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Button size="small" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide" : "Show"} {packages.length} closed package{packages.length === 1 ? "" : "s"}
      </Button>
      {open && (
        <Stack spacing={1.5} sx={{ mt: 1.5 }}>
          {packages.map((pkg) => (
            <Box key={pkg.id} sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 1 }}>
              <Typography fontWeight={600}>{pkg.package?.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ textTransform: "capitalize" }}>
                {pkg.status}
                {canCommercials && pkg.total_price != null ? ` · ${formatKyats(pkg.total_price)}` : ""}
              </Typography>
              <Button size="small" sx={{ mt: 0.5 }} onClick={() => onUsageHistory(pkg)}>
                Usage history
              </Button>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
