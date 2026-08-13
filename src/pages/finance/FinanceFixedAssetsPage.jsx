import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import {
  getFixedAssets,
  createFixedAsset,
  postAssetDepreciation,
} from "../../services/financeService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import { hasPermission } from "../../utils/accessUtils";
import useAuthStore from "../../stores/authStore";
import { formatKyats } from "../../utils/formatKyats";
import dayjs from "dayjs";
import { FinancePageHeader, useFinanceTokens } from "../../components/finance";

export default function FinanceFixedAssetsPage() {
  const { user } = useAuthStore();
  const { pushToast } = useToastStore();
  const { financeSurfaceSx } = useFinanceTokens();
  const canManage = hasPermission(user, "payments.manage");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    asset_code: "",
    asset_name: "",
    category: "equipment",
    purchase_date: dayjs().format("YYYY-MM-DD"),
    purchase_cost: "",
    useful_life_months: "36",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFixedAssets();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      pushToast({ message: resolveApiError(e, "Failed to load assets."), severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const code = form.asset_code.trim() || `AST-${Date.now()}`;
      await createFixedAsset(
        {
          asset_code: code,
          asset_name: form.asset_name,
          category: form.category,
          purchase_date: form.purchase_date,
          purchase_cost: Number(form.purchase_cost),
          useful_life_months: Number(form.useful_life_months),
        },
        `asset-${code}`,
      );
      pushToast({ message: "Asset registered.", severity: "success" });
      setOpen(false);
      load();
    } catch (e) {
      pushToast({ message: resolveApiError(e, "Create failed."), severity: "error" });
    } finally {
      setSaving(false);
    }
  };

  const runDepreciation = async (assetId) => {
    try {
      await postAssetDepreciation(assetId, {
        period_year: dayjs().year(),
        period_month: dayjs().month() + 1,
      });
      pushToast({ message: "Depreciation posted.", severity: "success" });
      load();
    } catch (e) {
      pushToast({ message: resolveApiError(e, "Depreciation failed."), severity: "error" });
    }
  };

  return (
    <Box sx={{ ...financeSurfaceSx, p: { xs: 2, sm: 3 } }}>
      <FinancePageHeader
        title="Fixed assets"
        subtitle="Register assets and post monthly depreciation to the journal."
        guide={[
          "The clinic's equipment register — each asset with its purchase cost and useful life.",
          "Post monthly depreciation to spread an asset's cost over its life; the net value flows to the Balance Sheet.",
        ]}
        actions={
          canManage ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
              Register asset
            </Button>
          ) : null
        }
      />

      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
        {loading ? (
          <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell align="right">Cost</TableCell>
                <TableCell>Life (mo)</TableCell>
                <TableCell align="right">Depr. runs</TableCell>
                {canManage ? <TableCell align="right">Actions</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.asset_code}</TableCell>
                  <TableCell>{a.asset_name}</TableCell>
                  <TableCell align="right">{formatKyats(Number(a.purchase_cost))}</TableCell>
                  <TableCell>{a.useful_life_months}</TableCell>
                  <TableCell align="right">{(a.depreciations || []).length}</TableCell>
                  {canManage ? (
                    <TableCell align="right">
                      <Button size="small" onClick={() => runDepreciation(a.id)}>
                        Post this month
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
              {!rows.length ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5}>
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                      No fixed assets.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Register fixed asset</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Asset code"
              fullWidth
              value={form.asset_code}
              onChange={(e) => setForm((f) => ({ ...f, asset_code: e.target.value }))}
              helperText="Leave blank to auto-generate"
            />
            <TextField
              label="Asset name"
              fullWidth
              required
              value={form.asset_name}
              onChange={(e) => setForm((f) => ({ ...f, asset_name: e.target.value }))}
            />
            <TextField
              label="Category"
              fullWidth
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
            <TextField
              label="Purchase date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={form.purchase_date}
              onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))}
            />
            <TextField
              label="Purchase cost"
              type="number"
              fullWidth
              value={form.purchase_cost}
              onChange={(e) => setForm((f) => ({ ...f, purchase_cost: e.target.value }))}
            />
            <TextField
              label="Useful life (months)"
              type="number"
              fullWidth
              value={form.useful_life_months}
              onChange={(e) => setForm((f) => ({ ...f, useful_life_months: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={saving || !form.asset_name || !form.purchase_cost}
          >
            {saving ? <CircularProgress size={22} /> : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
