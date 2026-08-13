import { useCallback, useEffect, useState } from "react";
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
import AddIcon from "@mui/icons-material/Add";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import AppRegistrationOutlinedIcon from "@mui/icons-material/AppRegistrationOutlined";
import TrackChangesOutlinedIcon from "@mui/icons-material/TrackChangesOutlined";
import NotificationsActiveOutlinedIcon from "@mui/icons-material/NotificationsActiveOutlined";
import useAuthStore from "../../stores/authStore";
import { hasPermission } from "../../utils/accessUtils";
import {
  createEquipmentConsumable,
  getEquipmentConsumables,
  getProducts,
  logEquipmentConsumableUsage,
} from "./inventoryService";

const EMPTY_STEPS = [
  {
    icon: AppRegistrationOutlinedIcon,
    title: "Register the part",
    body: "Link a product (e.g. laser tip, IPL cartridge) with its rated shot count and optional serial number.",
  },
  {
    icon: TrackChangesOutlinedIcon,
    title: "Log usage",
    body: "After each treatment, record shots used. Remaining life updates automatically on this page.",
  },
  {
    icon: NotificationsActiveOutlinedIcon,
    title: "Get alerted",
    body: "Parts below 10% remaining or fully depleted appear in inventory alerts so you can reorder in time.",
  },
];

export default function EquipmentConsumablesPage() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const canManage = hasPermission(user, "inventory.manage");

  const [rows, setRows] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [usageTarget, setUsageTarget] = useState(null);
  const [form, setForm] = useState({
    product_id: "",
    serial_number: "",
    rated_shots: "",
  });
  const [usageShots, setUsageShots] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [list, prods] = await Promise.all([
        getEquipmentConsumables(),
        getProducts(),
      ]);
      setRows(Array.isArray(list) ? list : []);
      setProducts(Array.isArray(prods) ? prods : []);
    } catch {
      setError("Could not load equipment consumables.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRegister = async () => {
    setSaving(true);
    try {
      await createEquipmentConsumable({
        product_id: Number(form.product_id),
        serial_number: form.serial_number || null,
        rated_shots: Number(form.rated_shots),
      });
      setRegisterOpen(false);
      setForm({ product_id: "", serial_number: "", rated_shots: "" });
      await load();
    } catch {
      setError("Failed to register consumable.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogUsage = async () => {
    if (!usageTarget) return;
    setSaving(true);
    try {
      await logEquipmentConsumableUsage(usageTarget.id, {
        shots: Number(usageShots),
      });
      setUsageTarget(null);
      setUsageShots("");
      await load();
    } catch {
      setError("Failed to log usage.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.5}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Equipment consumables
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 640 }}>
            Track shot-count parts for lasers and devices — tips, handpieces, and
            cartridges that wear out by use, not by stock quantity.
          </Typography>
        </Box>
        {canManage && rows.length > 0 && (
          <Button
            startIcon={<AddIcon />}
            variant="contained"
            onClick={() => setRegisterOpen(true)}
          >
            Register part
          </Button>
        )}
      </Stack>

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
            bgcolor: alpha(
              theme.palette.primary.main,
              theme.palette.mode === "dark" ? 0.06 : 0.04,
            ),
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
                  theme.palette.primary.main,
                  theme.palette.mode === "dark" ? 0.2 : 0.12,
                ),
              }}
            >
              <BuildOutlinedIcon sx={{ fontSize: 36, color: "primary.main" }} />
            </Box>
            <Typography variant="h6" fontWeight={700} color="text.primary" gutterBottom>
              No equipment consumables yet
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 540, mx: "auto", lineHeight: 1.65 }}
            >
              Clinic-owned machines belong under Finance → Fixed Assets. This page is
              for replaceable parts with a fixed shot life — register each physical
              unit once, then log usage as treatments run.
            </Typography>
            {canManage && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setRegisterOpen(true)}
                sx={{ mt: 2.5 }}
              >
                Register first part
              </Button>
            )}
          </Box>

          <Box sx={{ px: { xs: 2.5, sm: 4 }, pb: { xs: 4, sm: 5 }, pt: 1 }}>
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
                    <Box sx={{ mt: 0.25, color: "primary.main", display: "flex" }}>
                      <Icon fontSize="small" />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        {title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
                        {body}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              ))}
            </Stack>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 3, display: "block", textAlign: "center" }}
            >
              Use product type <strong>Equipment</strong> for consumable parts only — not
              for capital machines.
            </Typography>
          </Box>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Serial</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Used / rated
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">
                  Remaining
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                {canManage && <TableCell sx={{ fontWeight: 700 }} />}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell>{row.product?.name ?? "—"}</TableCell>
                  <TableCell>{row.serial_number ?? "—"}</TableCell>
                  <TableCell align="right">
                    {row.used_shots} / {row.rated_shots}
                  </TableCell>
                  <TableCell align="right">{row.remaining_shots}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={row.status}
                      color={
                        row.status === "depleted"
                          ? "error"
                          : row.remaining_pct < 10
                            ? "warning"
                            : "success"
                      }
                    />
                  </TableCell>
                  {canManage && (
                    <TableCell align="right">
                      {row.status === "active" && (
                        <Button size="small" onClick={() => setUsageTarget(row)}>
                          Log usage
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
        open={registerOpen}
        onClose={() => !saving && setRegisterOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Register equipment consumable</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              label="Product"
              value={form.product_id}
              onChange={(e) => setForm((f) => ({ ...f, product_id: e.target.value }))}
              fullWidth
            >
              <MenuItem value="">Select…</MenuItem>
              {products.map((p) => (
                <MenuItem key={p.id} value={String(p.id)}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Serial number"
              value={form.serial_number}
              onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Rated shots"
              type="number"
              value={form.rated_shots}
              onChange={(e) => setForm((f) => ({ ...f, rated_shots: e.target.value }))}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegisterOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleRegister}
            disabled={saving || !form.product_id || !form.rated_shots}
          >
            {saving ? "Saving…" : "Register"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(usageTarget)} onClose={() => !saving && setUsageTarget(null)}>
        <DialogTitle>Log shot usage</DialogTitle>
        <DialogContent>
          <TextField
            label="Shots used"
            type="number"
            value={usageShots}
            onChange={(e) => setUsageShots(e.target.value)}
            fullWidth
            sx={{ mt: 1, minWidth: 280 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUsageTarget(null)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleLogUsage} disabled={saving || !usageShots}>
            {saving ? "Saving…" : "Log"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
