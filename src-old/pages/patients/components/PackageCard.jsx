import { useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import HistoryIcon from "@mui/icons-material/History";
import dayjs from "dayjs";
import { formatKyats } from "../../../utils/formatKyats";

const TERMINAL = new Set(["traded_in", "cancelled", "refunded"]);

function expiryLabel(expiryDate) {
  if (!expiryDate) return { text: "No expiry", color: "text.secondary" };
  const d = dayjs(expiryDate);
  const days = d.diff(dayjs(), "day");
  if (days < 0) return { text: `Expired ${d.format("DD-MM-YYYY")}`, color: "error.main" };
  return {
    text: `Expires ${d.format("DD-MM-YYYY")} (in ${days} days)`,
    color: days < 30 ? "error.main" : "text.secondary",
  };
}

export default function PackageCard({
  pkg,
  canCommercials,
  canTrade,
  canLifecycle,
  onUsageHistory,
  onTradeIn,
  onFreeze,
  onUnfreeze,
  onTransfer,
  onBeneficiaries,
}) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const frozen = Boolean(pkg.frozen_at);
  const terminal = TERMINAL.has(pkg.status);
  const expiry = expiryLabel(pkg.expiry_date);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderColor: frozen ? "warning.main" : undefined,
        borderWidth: frozen ? 2 : 1,
        opacity: terminal ? 0.85 : 1,
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
        <Box>
          <Typography variant="h6" fontSize="1rem" fontWeight={700}>
            {pkg.package?.name ?? "Package"}
          </Typography>
          {canCommercials && (
            <Typography variant="body2" color="text.secondary">
              Sold {pkg.purchased_at ? dayjs(pkg.purchased_at).format("DD-MM-YYYY") : "—"}
              {pkg.sold_by?.name ? ` by ${pkg.sold_by.name}` : ""}
              {pkg.total_price != null ? ` · ${formatKyats(pkg.total_price)}` : ""}
            </Typography>
          )}
        </Box>
        <Chip size="small" label={pkg.status} sx={{ textTransform: "capitalize" }} />
      </Stack>

      <Typography variant="body2" sx={{ mt: 1, color: expiry.color }}>
        {expiry.text}
      </Typography>

      {frozen && (
        <Box sx={{ mt: 1, p: 1, bgcolor: "warning.light", borderRadius: 1 }}>
          <Typography variant="body2">
            Frozen on {dayjs(pkg.frozen_at).format("DD-MM-YYYY HH:mm")}
            {pkg.freeze_reason ? ` — "${pkg.freeze_reason}"` : ""}
          </Typography>
          {canLifecycle && (
            <Button size="small" sx={{ mt: 0.5 }} onClick={() => onUnfreeze(pkg)}>
              Unfreeze
            </Button>
          )}
        </Box>
      )}

      <Typography variant="subtitle2" sx={{ mt: 1.5, mb: 0.5 }}>
        Treatments
      </Typography>
      <Stack spacing={1}>
        {(pkg.items || []).map((item) => {
          const catalogLine = pkg.package?.items?.find(
            (l) => l.treatment_template_id === item.treatment_template_id,
          );
          const total = Number(catalogLine?.total_sessions ?? item.remaining_sessions ?? 0);
          const rem = Number(item.remaining_sessions ?? 0);
          const pct = total > 0 ? Math.min(100, (rem / total) * 100) : 0;
          const name = item.treatment_template?.name ?? `Treatment #${item.treatment_template_id}`;
          return (
            <Box key={item.id}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2">{name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {rem} / {total} remaining
                </Typography>
              </Stack>
              <LinearProgress variant="determinate" value={pct} sx={{ mt: 0.25, height: 6, borderRadius: 1 }} />
            </Box>
          );
        })}
      </Stack>

      {(pkg.beneficiary_patients || pkg.beneficiaryPatients)?.length > 0 && (
        <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mt: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center", mr: 0.5 }}>
            Beneficiaries:
          </Typography>
          {(pkg.beneficiary_patients || pkg.beneficiaryPatients).map((b) => (
            <Chip key={b.id} size="small" label={b.name} />
          ))}
        </Stack>
      )}

      {!terminal && (
        <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap">
          <Button size="small" startIcon={<HistoryIcon />} onClick={() => onUsageHistory(pkg)}>
            Usage history
          </Button>
          {canTrade && (
            <Button size="small" variant="outlined" onClick={() => onTradeIn(pkg)}>
              Trade-in or cancel
            </Button>
          )}
          {canLifecycle && (
            <>
              <IconButton size="small" onClick={(e) => setMenuAnchor(e.currentTarget)}>
                <MoreVertIcon fontSize="small" />
              </IconButton>
              <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
                {!frozen && (
                  <MenuItem
                    onClick={() => {
                      setMenuAnchor(null);
                      onFreeze(pkg);
                    }}
                  >
                    Freeze
                  </MenuItem>
                )}
                <MenuItem
                  onClick={() => {
                    setMenuAnchor(null);
                    onTransfer(pkg);
                  }}
                >
                  Transfer
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setMenuAnchor(null);
                    onBeneficiaries(pkg);
                  }}
                >
                  Edit beneficiaries
                </MenuItem>
              </Menu>
            </>
          )}
        </Stack>
      )}
    </Paper>
  );
}
