import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import GuidedEmptyState from "../../components/common/GuidedEmptyState";
import {
  FinanceCoaAccountLabel,
  FinancePageHeader,
  FinancePanel,
  FinancePanelHeader,
  FinancePanelTable,
  FinanceRowActions,
  useFinanceTokens,
} from "../../components/finance";
import ChartOfAccountPicker from "../../components/finance/ChartOfAccountPicker";
import { listChartOfAccounts } from "../../services/financeService";
import { resolveApiError } from "../../services/apiClient";
import {
  getTransactionMethods,
  createTransactionMethod,
  updateTransactionMethod,
  deleteTransactionMethod,
} from "../../services/transactionMethodService";
import useAuthStore from "../../stores/authStore";
import useConfirmStore from "../../stores/confirmStore";
import useToastStore from "../../stores/toastStore";
import { hasPermission } from "../../utils/accessUtils";
import { rolePrefixFromPathname } from "../../utils/financeSourceNavigation";

const LEDGER_KIND_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Bank transfer" },
  { value: "e-wallet", label: "E-wallet" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

const TM_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "expire", label: "Expire" },
];

const TM_COLUMNS = [
  { id: "name", label: "Name" },
  { id: "account", label: "Account / phone" },
  { id: "bank", label: "Bank" },
  { id: "coa", label: "Linked COA" },
  { id: "ledger", label: "Ledger", width: 100 },
  { id: "default", label: "Default", width: 72 },
  { id: "status", label: "Status", width: 100 },
  { id: "actions", label: "", align: "right", width: 72 },
];

const emptyForm = {
  name: "",
  account_or_phone: "",
  bank_name: "",
  memo: "",
  is_default: false,
  status: "active",
  ledger_kind: "transfer",
  chart_of_account_id: "",
};

const EMPTY_STEPS = [
  {
    icon: AccountBalanceOutlinedIcon,
    title: "Add cash or bank methods",
    body: "Create a method for each way the clinic receives or pays money — cash drawer, bank transfer, e-wallet, or card.",
  },
  {
    icon: AccountTreeOutlinedIcon,
    title: "Link to chart of accounts",
    body: "Each method must map to an asset account so payments and expenses post to the correct ledger head.",
  },
  {
    icon: PaymentsOutlinedIcon,
    title: "Used when recording money",
    body: "Staff pick these methods when recording patient payments, expenses, and other income.",
  },
];

function formatLinkedCoa(row) {
  if (!row.chart_of_account) return null;
  const { code, name } = row.chart_of_account;
  if (!code && !name) return null;
  return (
    <FinanceCoaAccountLabel code={code} name={name} separator=" — " />
  );
}

export default function FinanceTransactionMethodsPage() {
  const location = useLocation();
  const rolePrefix = rolePrefixFromPathname(location.pathname);
  const { user } = useAuthStore();
  const { pushToast } = useToastStore();
  const askConfirm = useConfirmStore((s) => s.askConfirm);
  const { financeToolbarSx, compactTableSx } = useFinanceTokens();
  const canManage = hasPermission(user, "finance.transaction_methods.manage");

  const [transactionMethods, setTransactionMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [assetCoaRows, setAssetCoaRows] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [dialogBaseline, setDialogBaseline] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await getTransactionMethods();
      setTransactionMethods(Array.isArray(rows) ? rows : []);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not load transaction methods."),
        severity: "error",
      });
      setTransactionMethods([]);
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!dialogOpen || !canManage) {
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const accounts = await listChartOfAccounts({
          type: "asset",
          is_active: true,
        });
        if (!cancelled) {
          setAssetCoaRows(Array.isArray(accounts) ? accounts : []);
        }
      } catch {
        if (!cancelled) {
          setAssetCoaRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dialogOpen, canManage]);

  const formSnapshot = () =>
    JSON.stringify({
      id: editingId,
      name: form.name,
      account_or_phone: form.account_or_phone,
      bank_name: form.bank_name,
      memo: form.memo,
      is_default: form.is_default,
      status: form.status,
      ledger_kind: form.ledger_kind,
      chart_of_account_id: form.chart_of_account_id,
    });

  const isDialogDirty = () => formSnapshot() !== dialogBaseline;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogBaseline(
      JSON.stringify({
        id: null,
        ...emptyForm,
      }),
    );
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    const next = {
      name: row.name || "",
      account_or_phone: row.account_or_phone || "",
      bank_name: row.bank_name || "",
      memo: row.memo || "",
      is_default: Boolean(row.is_default),
      status: row.status || "active",
      ledger_kind: row.ledger_kind || "transfer",
      chart_of_account_id:
        row.chart_of_account_id != null ? String(row.chart_of_account_id) : "",
    };
    setForm(next);
    setDialogBaseline(
      JSON.stringify({
        id: row.id,
        ...next,
      }),
    );
    setDialogOpen(true);
  };

  const requestCloseDialog = async () => {
    if (isDialogDirty()) {
      const ok = await askConfirm({
        title: "Discard changes?",
        message:
          "You have unsaved changes for this transaction method. Close without saving?",
        confirmText: "Discard",
      });
      if (!ok) return;
    }
    setDialogOpen(false);
  };

  const coaPayload = () => {
    const s = String(form.chart_of_account_id ?? "").trim();
    if (s === "") {
      return { chart_of_account_id: null };
    }
    return { chart_of_account_id: Number(s) };
  };

  const handleSave = async () => {
    if (!String(form.name || "").trim()) {
      pushToast({ message: "Name is required.", severity: "warning" });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const editing = transactionMethods.find((r) => r.id === editingId);
        const payload = editing?.is_system
          ? {
              memo: form.memo,
              is_default: form.is_default,
              status: form.status,
              ...coaPayload(),
            }
          : {
              name: form.name.trim(),
              account_or_phone: form.account_or_phone.trim() || null,
              bank_name: form.bank_name.trim() || null,
              memo: form.memo.trim() || null,
              is_default: form.is_default,
              status: form.status,
              ledger_kind: form.ledger_kind,
              ...coaPayload(),
            };
        await updateTransactionMethod(editingId, payload);
      } else {
        await createTransactionMethod({
          name: form.name.trim(),
          account_or_phone: form.account_or_phone.trim() || null,
          bank_name: form.bank_name.trim() || null,
          memo: form.memo.trim() || null,
          is_default: form.is_default,
          status: form.status,
          ledger_kind: form.ledger_kind,
          ...coaPayload(),
        });
      }
      setDialogOpen(false);
      pushToast({ message: "Transaction method saved.", severity: "success" });
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not save transaction method."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    if (row.is_system) return;
    const ok = await askConfirm({
      title: "Delete transaction method",
      message: `Delete "${row.name}"? This cannot be undone.`,
      confirmText: "Delete",
    });
    if (!ok) return;
    try {
      await deleteTransactionMethod(row.id);
      pushToast({ message: "Deleted.", severity: "success" });
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not delete."),
        severity: "error",
      });
    }
  };

  const editingRow = editingId
    ? transactionMethods.find((r) => r.id === editingId)
    : null;
  const isSystemEdit = Boolean(editingRow?.is_system);

  if (!canManage) {
    return (
      <Alert severity="warning">
        You do not have permission to manage transaction methods.
      </Alert>
    );
  }

  const showGuidedEmpty = !loading && transactionMethods.length === 0;

  return (
    <FinancePanel>
      <FinancePanelHeader>
        <FinancePageHeader
          title="Transaction Methods"
          subtitle="Payment channels linked to chart-of-accounts asset accounts. Used when recording payments, expenses, and other income."
        />
      </FinancePanelHeader>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        spacing={1}
        sx={financeToolbarSx}
      >
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <Typography
            variant="subtitle2"
            fontWeight={700}
            sx={{ letterSpacing: "0.02em", color: "text.primary" }}
          >
            Methods
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 500 }}
          >
            {transactionMethods.length} total
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} flexWrap="wrap">
          <Button
            variant="outlined"
            size="small"
            onClick={load}
            disabled={loading}
          >
            Refresh
          </Button>
          {transactionMethods.length > 0 ? (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={openCreate}
            >
              Add new
            </Button>
          ) : null}
        </Stack>
      </Stack>

      <FinancePanelTable>
        {showGuidedEmpty ? (
          <GuidedEmptyState
            icon={AccountBalanceOutlinedIcon}
            title="No transaction methods yet"
            description="Payment methods tell the system which cash or bank account to use when money moves. Add your first method and link it to a chart-of-accounts asset head."
            steps={EMPTY_STEPS}
            primaryAction={{
              label: "Add first method",
              onClick: openCreate,
              startIcon: <AddIcon />,
            }}
            footer={
              <>
                Link each method to an account in{" "}
                <Typography
                  component={RouterLink}
                  to={`${rolePrefix}/finance/chart-of-accounts`}
                  variant="body2"
                  sx={{
                    color: "primary.main",
                    fontWeight: 600,
                    textDecoration: "none",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  Financial Management → Chart of Accounts
                </Typography>
                .
              </>
            }
          />
        ) : loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <LoadingIndicator size={40} />
          </Box>
        ) : (
          <Table size="small" sx={compactTableSx}>
            <TableHead>
              <TableRow>
                {TM_COLUMNS.map((col) => (
                  <TableCell
                    key={col.id}
                    align={col.align}
                    sx={col.width ? { width: col.width } : undefined}
                  >
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {transactionMethods.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.account_or_phone || "—"}</TableCell>
                  <TableCell>{row.bank_name || "—"}</TableCell>
                  <TableCell>{formatLinkedCoa(row) ?? "—"}</TableCell>
                  <TableCell sx={{ textTransform: "capitalize" }}>
                    {row.ledger_kind}
                  </TableCell>
                  <TableCell>{row.is_default ? "Yes" : "—"}</TableCell>
                  <TableCell sx={{ textTransform: "capitalize" }}>
                    {row.status}
                  </TableCell>
                  <TableCell align="right">
                    <FinanceRowActions
                      actions={[
                        {
                          variant: "edit",
                          onClick: () => openEdit(row),
                        },
                        ...(!row.is_system
                          ? [
                              {
                                variant: "delete",
                                onClick: () => void handleDelete(row),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </FinancePanelTable>

      <Dialog
        open={dialogOpen}
        onClose={() => void requestCloseDialog()}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingId ? "Edit transaction method" : "New transaction method"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {isSystemEdit ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  System Cash: you can adjust memo, default flag, status, and
                  which chart-of-accounts asset receives cash postings.
                </Typography>
                <ChartOfAccountPicker
                  accounts={assetCoaRows}
                  value={form.chart_of_account_id}
                  onChange={(id) =>
                    setForm((p) => ({ ...p, chart_of_account_id: id }))
                  }
                  onAccountsChange={setAssetCoaRows}
                  listParams={{ type: "asset", is_active: true }}
                  dialogDefaultType="asset"
                  label="Ledger account (chart of accounts)"
                  size="small"
                />
                <TextField
                  label="Memo"
                  fullWidth
                  multiline
                  minRows={2}
                  value={form.memo}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, memo: e.target.value }))
                  }
                />
                <TextField
                  select
                  label="Status"
                  fullWidth
                  value={form.status}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, status: e.target.value }))
                  }
                >
                  {TM_STATUS_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.is_default}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          is_default: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Default receive method"
                />
              </>
            ) : (
              <>
                <TextField
                  label="Name"
                  required
                  fullWidth
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                />
                <TextField
                  label="Account no. / phone no."
                  fullWidth
                  value={form.account_or_phone}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      account_or_phone: e.target.value,
                    }))
                  }
                />
                <TextField
                  label="Bank name"
                  fullWidth
                  value={form.bank_name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, bank_name: e.target.value }))
                  }
                />
                <TextField
                  label="Memo"
                  fullWidth
                  multiline
                  minRows={2}
                  value={form.memo}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, memo: e.target.value }))
                  }
                />
                <TextField
                  select
                  label="Ledger category"
                  fullWidth
                  value={form.ledger_kind}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, ledger_kind: e.target.value }))
                  }
                >
                  {LEDGER_KIND_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>
                <ChartOfAccountPicker
                  accounts={assetCoaRows}
                  value={form.chart_of_account_id}
                  onChange={(id) =>
                    setForm((p) => ({ ...p, chart_of_account_id: id }))
                  }
                  onAccountsChange={setAssetCoaRows}
                  listParams={{ type: "asset", is_active: true }}
                  dialogDefaultType="asset"
                  label="Ledger account (chart of accounts)"
                  size="small"
                />
                <TextField
                  select
                  label="Status"
                  fullWidth
                  value={form.status}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, status: e.target.value }))
                  }
                >
                  {TM_STATUS_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </TextField>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.is_default}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          is_default: e.target.checked,
                        }))
                      }
                    />
                  }
                  label="Default receive method"
                />
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => void requestCloseDialog()}>Cancel</Button>
          <Button
            variant="contained"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>
    </FinancePanel>
  );
}
