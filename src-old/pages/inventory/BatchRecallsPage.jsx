import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
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
import LoadingIndicator from "../../components/common/LoadingIndicator";
import { alpha, useTheme } from "@mui/material/styles";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import PeopleOutlineOutlinedIcon from "@mui/icons-material/PeopleOutlineOutlined";
import useAuthStore from "../../stores/authStore";
import { hasPermission } from "../../utils/accessUtils";
import { resolveUserPrimaryRole } from "../../utils/workspaceRoutes";
import { closeBatchRecall, getBatchRecalls } from "./inventoryService";

const EMPTY_STEPS = [
  {
    icon: SearchOutlinedIcon,
    title: "Find the lot",
    body: "Open a product, go to Batches, and use View affected patients to see who received that lot.",
  },
  {
    icon: BlockOutlinedIcon,
    title: "Quarantine stock",
    body: "Open recall from the batch row to block FIFO use and snapshot remaining quantity.",
  },
  {
    icon: PeopleOutlineOutlinedIcon,
    title: "Follow up",
    body: "Affected patients are flagged here with severity and status until you close the recall.",
  },
];

export default function BatchRecallsPage() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const canManage = hasPermission(user, "inventory.manage");
  const inventoryPath = `/${resolveUserPrimaryRole(user)}/inventory`;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [closeTarget, setCloseTarget] = useState(null);
  const [disposition, setDisposition] = useState("released");
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await getBatchRecalls());
    } catch {
      setError("Could not load batch recalls.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleClose = async () => {
    if (!closeTarget) return;
    setClosing(true);
    try {
      await closeBatchRecall(closeTarget.id, disposition);
      setCloseTarget(null);
      await load();
    } catch {
      setError("Failed to close recall.");
    } finally {
      setClosing(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700} color="text.primary">
          Batch recalls
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.5, maxWidth: 640 }}
        >
          Lot traceability for injectables, fillers, and other batched products
          — quarantine affected stock and track patients who received a recalled
          batch.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : rows.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "background.paper",
          }}
        >
          <Box
            sx={{
              textAlign: "center",
              py: { xs: 5, sm: 7 },
              px: { xs: 2.5, sm: 4 },
            }}
          >
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 2,
                bgcolor: alpha(
                  theme.palette.warning.main,
                  theme.palette.mode === "dark" ? 0.2 : 0.12,
                ),
              }}
            >
              <WarningAmberOutlinedIcon
                sx={{ fontSize: 36, color: "warning.main" }}
              />
            </Box>
            <Typography
              variant="h6"
              fontWeight={700}
              color="text.primary"
              gutterBottom
            >
              No recalls on record
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 520, mx: "auto", lineHeight: 1.65 }}
            >
              That is usually good news. When a supplier or regulator flags a
              batch, this page becomes your audit trail: open recalls,
              quarantined quantity, and patients to contact.
            </Typography>
          </Box>

          <Box
            sx={{
              px: { xs: 2.5, sm: 4 },
              pb: { xs: 4, sm: 5 },
              pt: 1,
            }}
          >
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{ maxWidth: 960, mx: "auto" }}
            >
              {EMPTY_STEPS.map(({ icon: Icon, title, body }) => (
                <Paper
                  key={title}
                  variant="outlined"
                  sx={{
                    flex: 1,
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: "background.paper",
                    textAlign: "left",
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <Box
                      sx={{
                        mt: 0.25,
                        color: "warning.main",
                        display: "flex",
                      }}
                    >
                      <Icon fontSize="small" />
                    </Box>
                    <Box>
                      <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        gutterBottom
                      >
                        {title}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        lineHeight={1.6}
                      >
                        {body}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Stack>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 3, textAlign: "center" }}
            >
              {canManage ? (
                <>
                  To start a recall, open a product under{" "}
                  <Typography
                    component={RouterLink}
                    to={inventoryPath}
                    variant="body2"
                    sx={{
                      color: "primary.main",
                      fontWeight: 600,
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    Inventory → Products
                  </Typography>
                  , select a batch, and choose <strong>Open recall</strong>.
                </>
              ) : (
                "Recalls are opened from a product’s batch list by staff with inventory manage access."
              )}
            </Typography>
          </Box>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Batch #</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Severity</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Quarantined qty
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Opened</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Patients
                </TableCell>
                {canManage && <TableCell sx={{ fontWeight: 700 }} />}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.product?.name ?? "—"}</TableCell>
                  <TableCell>
                    {row.batch_number ?? row.batch?.batch_number ?? "—"}
                  </TableCell>
                  <TableCell>{row.severity}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.status}
                      color={row.status === "open" ? "warning" : "default"}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {row.quarantined_quantity}
                  </TableCell>
                  <TableCell>
                    {row.created_at
                      ? dayjs(row.created_at).format("DD-MM-YYYY HH:mm")
                      : "—"}
                  </TableCell>
                  <TableCell align="right">
                    {row.patient_flags_count ?? 0}
                  </TableCell>
                  {canManage && (
                    <TableCell align="right">
                      {row.status === "open" && (
                        <Button
                          size="small"
                          onClick={() => setCloseTarget(row)}
                        >
                          Close
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={Boolean(closeTarget)}
        onClose={() => !closing && setCloseTarget(null)}
      >
        <DialogTitle>Close recall</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1, minWidth: 320 }}>
            <Typography variant="body2" color="text.secondary">
              {closeTarget?.product?.name} — batch {closeTarget?.batch_number}
            </Typography>
            <TextField
              select
              label="Disposition"
              value={disposition}
              onChange={(e) => setDisposition(e.target.value)}
              fullWidth
            >
              <MenuItem value="released">Release quarantine</MenuItem>
              <MenuItem value="written_off">Write off remaining stock</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCloseTarget(null)} disabled={closing}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleClose} disabled={closing}>
            {closing ? "Closing…" : "Confirm"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
