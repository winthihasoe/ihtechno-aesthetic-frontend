import { useCallback, useEffect, useState } from "react";
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
import AddIcon from "@mui/icons-material/Add";
import useAuthStore from "../../stores/authStore";
import { hasPermission } from "../../utils/accessUtils";
import { formatKyats } from "../../utils/formatKyats";
import {
  createSupplierReturn,
  getBatches,
  getProducts,
  getSupplierReturns,
  getSuppliers,
  postSupplierReturn,
} from "./inventoryService";

const REASONS = [
  { value: "expired", label: "Expired" },
  { value: "damaged", label: "Damaged" },
  { value: "wrong_item", label: "Wrong item" },
  { value: "overstock", label: "Overstock" },
  { value: "recall", label: "Recall" },
];

const EMPTY_ITEM = { product_id: "", batch_id: "", quantity: "" };

export default function SupplierReturnsPage() {
  const { user } = useAuthStore();
  const canManage = hasPermission(user, "inventory.manage");

  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    supplier_id: "",
    date: dayjs().format("YYYY-MM-DD"),
    reason: "expired",
    credit_note_ref: "",
    notes: "",
  });
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);
  const [batchOptions, setBatchOptions] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReturns(await getSupplierReturns());
    } catch {
      setError("Could not load supplier returns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = async () => {
    setForm({
      supplier_id: "",
      date: dayjs().format("YYYY-MM-DD"),
      reason: "expired",
      credit_note_ref: "",
      notes: "",
    });
    setItems([{ ...EMPTY_ITEM }]);
    setSaveError("");
    setDialogOpen(true);
    const [s, p] = await Promise.all([getSuppliers(), getProducts()]);
    setSuppliers(s);
    setProducts(p?.data ?? p ?? []);
  };

  const loadBatches = async (productId, idx) => {
    if (!productId) return;
    const batches = await getBatches(productId);
    setBatchOptions((prev) => ({ ...prev, [idx]: batches }));
  };

  const submit = async () => {
    const validItems = items.filter(
      (it) => it.product_id && it.batch_id && Number(it.quantity) > 0,
    );
    if (!form.supplier_id || validItems.length === 0) {
      setSaveError("Supplier and at least one return line are required.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const created = await createSupplierReturn({
        ...form,
        supplier_id: Number(form.supplier_id),
        items: validItems.map((it) => ({
          product_id: Number(it.product_id),
          batch_id: Number(it.batch_id),
          quantity: Number(it.quantity),
        })),
      });
      await postSupplierReturn(created.id);
      setDialogOpen(false);
      load();
    } catch (e) {
      setSaveError(e?.response?.data?.message ?? "Failed to save return.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Supplier returns
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Return stock to suppliers and queue credit journals for accounting.
          </Typography>
        </Box>
        {canManage ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New return
          </Button>
        ) : null}
      </Stack>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell align="right">Credit amount</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Accounting</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {returns.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{dayjs(row.date).format("DD MMM YYYY")}</TableCell>
                  <TableCell>{row.supplier?.name ?? "—"}</TableCell>
                  <TableCell>{row.reason}</TableCell>
                  <TableCell align="right">{formatKyats(row.total_amount)}</TableCell>
                  <TableCell>
                    <Chip label={row.status} size="small" />
                  </TableCell>
                  <TableCell>
                    {row.journal_posting_status ? (
                      <Chip label={row.journal_posting_status} size="small" color="warning" />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Record supplier return</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {saveError ? <Alert severity="error">{saveError}</Alert> : null}
            <TextField
              select
              label="Supplier"
              value={form.supplier_id}
              onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}
              fullWidth
            >
              {suppliers.map((s) => (
                <MenuItem key={s.id} value={String(s.id)}>
                  {s.name}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Date"
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                select
                label="Reason"
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                fullWidth
              >
                {REASONS.map((r) => (
                  <MenuItem key={r.value} value={r.value}>
                    {r.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <TextField
              label="Credit note ref (optional)"
              value={form.credit_note_ref}
              onChange={(e) => setForm((f) => ({ ...f, credit_note_ref: e.target.value }))}
              fullWidth
            />
            {items.map((it, idx) => (
              <Paper key={idx} variant="outlined" sx={{ p: 2 }}>
                <Stack spacing={1.5}>
                  <TextField
                    select
                    label="Product"
                    value={it.product_id}
                    onChange={(e) => {
                      const product_id = e.target.value;
                      setItems((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, product_id, batch_id: "" } : row,
                        ),
                      );
                      loadBatches(product_id, idx);
                    }}
                    fullWidth
                  >
                    {products.map((p) => (
                      <MenuItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="Batch"
                    value={it.batch_id}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, batch_id: e.target.value } : row,
                        ),
                      )
                    }
                    fullWidth
                  >
                    {(batchOptions[idx] ?? []).map((b) => (
                      <MenuItem key={b.id} value={String(b.id)}>
                        {b.batch_number ?? b.id} · qty {b.quantity}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    label="Qty (base units)"
                    type="number"
                    value={it.quantity}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, quantity: e.target.value } : row,
                        ),
                      )
                    }
                    fullWidth
                  />
                </Stack>
              </Paper>
            ))}
            <Button
              variant="outlined"
              onClick={() => setItems((prev) => [...prev, { ...EMPTY_ITEM }])}
            >
              Add line
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Post return"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
