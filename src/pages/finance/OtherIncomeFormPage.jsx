import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  ListSubheader,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  createOtherIncome,
  getOtherIncome,
  listChartOfAccounts,
  updateOtherIncome,
} from "../../services/financeService";
import { getTransactionMethods } from "../../services/transactionMethodService";
import ChartOfAccountPicker from "../../components/finance/ChartOfAccountPicker";
import useToastStore from "../../stores/toastStore";
import useConfirmStore from "../../stores/confirmStore";
import { resolveApiError } from "../../services/apiClient";
import useAuthStore from "../../stores/authStore";
import { hasPermission } from "../../utils/accessUtils";
import {
  formatCommaAmountFromNumber,
  parseCommaAmount,
  sanitizeCommaAmountInput,
} from "../../utils/amountInputUtils";
import { groupedTransactionMethodsForSelect } from "../../utils/financialLedgerKindUtils";

function emptyForm() {
  const today = new Date().toISOString().slice(0, 10);
  return {
    income_date: today,
    amount: "",
    chart_of_account_id: "",
    transaction_method_id: "",
    reference_number: "",
    description: "",
  };
}

function serializeIncomeForm(f) {
  const amt = parseCommaAmount(f.amount);
  return JSON.stringify({
    income_date: f.income_date,
    amount: Number.isFinite(amt) ? amt : null,
    chart_of_account_id: String(f.chart_of_account_id ?? ""),
    transaction_method_id: String(f.transaction_method_id ?? ""),
    reference_number: String(f.reference_number ?? "").trim(),
    description: String(f.description ?? "").trim(),
  });
}

export default function OtherIncomeFormPage() {
  const { user } = useAuthStore();
  const { incomeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = Boolean(incomeId);
  const listPath = `/${location.pathname.split("/")[1]}/other-income`;

  const canManage = hasPermission(user, "finance.other_income.manage");
  const { pushToast } = useToastStore();
  const { askConfirm } = useConfirmStore();

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [coaRows, setCoaRows] = useState([]);
  const [transactionMethods, setTransactionMethods] = useState([]);
  const [coaReady, setCoaReady] = useState(false);
  const [dirtyBaseline, setDirtyBaseline] = useState(null);
  const formRef = useRef(form);
  formRef.current = form;

  useEffect(() => {
    let cancelled = false;
    async function loadDependencies() {
      try {
        const [accounts, methods] = await Promise.all([
          listChartOfAccounts({ type: "income", is_active: true }),
          getTransactionMethods().catch(() => []),
        ]);
        if (cancelled) return;
        const rows = Array.isArray(accounts) ? accounts : [];
        const mRows = Array.isArray(methods) ? methods : [];
        setCoaRows(rows);
        setTransactionMethods(mRows);
        if (!isEdit) {
          setForm((prev) => {
            let next = { ...prev };
            if (!prev.chart_of_account_id) {
              const defaultRow =
                rows.find((row) => row.code === "4100") ||
                rows.find((row) => row.name?.toLowerCase() === "other income");
              if (defaultRow) {
                next = { ...next, chart_of_account_id: String(defaultRow.id) };
              }
            }
            if (!String(next.transaction_method_id || "").trim()) {
              const cash = mRows.find((x) => x.is_system && x.ledger_kind === "cash");
              if (cash) {
                next = { ...next, transaction_method_id: String(cash.id) };
              }
            }
            return next;
          });
        }
        setCoaReady(true);
      } catch (error) {
        if (!cancelled) {
          pushToast({
            message: resolveApiError(error, "Could not load form options."),
            severity: "error",
          });
          setCoaReady(true);
        }
      }
    }
    loadDependencies();
    return () => {
      cancelled = true;
    };
  }, [isEdit, pushToast]);

  useEffect(() => {
    if (!isEdit) return;
    async function loadRow() {
      try {
        const row = await getOtherIncome(incomeId);
        setForm({
          income_date: row.income_date,
          amount:
            row.amount != null && row.amount !== ""
              ? formatCommaAmountFromNumber(Number(row.amount))
              : "",
          chart_of_account_id:
            row.chart_of_account_id != null ? String(row.chart_of_account_id) : "",
          transaction_method_id:
            row.transaction_method_id != null
              ? String(row.transaction_method_id)
              : "",
          reference_number: row.reference_number || "",
          description: row.description || "",
        });
      } catch (error) {
        pushToast({
          message: resolveApiError(error, "Could not load other income row."),
          severity: "error",
        });
        navigate(-1);
      } finally {
        setLoading(false);
      }
    }
    loadRow();
  }, [incomeId, isEdit, navigate, pushToast]);

  useEffect(() => {
    if (loading || dirtyBaseline !== null || !coaReady) return;
    setDirtyBaseline(serializeIncomeForm(formRef.current));
  }, [loading, coaReady, dirtyBaseline]);

  const isDirty = useMemo(
    () => dirtyBaseline !== null && serializeIncomeForm(form) !== dirtyBaseline,
    [dirtyBaseline, form],
  );

  // In-app route changes use BrowserRouter (no data router), so useBlocker is unavailable.
  // Tab close / refresh: beforeunload. Leaving via Cancel: handleCancel + askConfirm.

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const submit = async () => {
    const amt = parseCommaAmount(form.amount);
    if (
      !form.chart_of_account_id ||
      !Number.isFinite(amt) ||
      amt <= 0 ||
      !form.income_date ||
      !String(form.transaction_method_id || "").trim()
    ) {
      pushToast({
        message: "Enter a valid date, income account, received-via method, and amount.",
        severity: "warning",
      });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        income_date: form.income_date,
        amount: amt,
        chart_of_account_id: Number(form.chart_of_account_id),
        transaction_method_id: Number(form.transaction_method_id),
        reference_number: form.reference_number?.trim() || null,
        description: form.description?.trim() || null,
      };
      if (isEdit) {
        await updateOtherIncome(incomeId, payload);
        pushToast({ message: "Other income updated.", severity: "success" });
      } else {
        await createOtherIncome(payload);
        pushToast({ message: "Other income created.", severity: "success" });
      }
      navigate(listPath);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not save other income."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!isDirty) {
      navigate(listPath);
      return;
    }
    const ok = await askConfirm({
      title: "Discard changes?",
      message: "You have unsaved income details. Leave without saving?",
      confirmText: "Discard",
      cancelText: "Keep editing",
    });
    if (ok) navigate(listPath);
  };

  if (!canManage) {
    return <Alert severity="warning">You do not have permission to manage other income.</Alert>;
  }
  if (loading) {
    return <CircularProgress size={24} />;
  }

  const amountNum = parseCommaAmount(form.amount);

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>
        {isEdit ? "Edit Income" : "New Income"}
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Record non-invoice income like bank interest, referral fee, or commission fee.
      </Typography>

      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <TextField
              label="Income Date"
              type="date"
              value={form.income_date}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, income_date: event.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Amount"
              value={form.amount}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  amount: sanitizeCommaAmountInput(event.target.value),
                }))
              }
              fullWidth
              inputProps={{ inputMode: "decimal" }}
              placeholder="e.g. 100,000"
            />
          </Stack>

          <ChartOfAccountPicker
            accounts={coaRows}
            value={form.chart_of_account_id}
            onChange={(id) =>
              setForm((prev) => ({ ...prev, chart_of_account_id: id }))
            }
            onAccountsChange={setCoaRows}
            listParams={{ type: "income", is_active: true }}
            dialogDefaultType="income"
            label="Chart of Account"
            required
          />

          <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel id="other-income-received-via">Received via</InputLabel>
              <Select
                labelId="other-income-received-via"
                label="Received via"
                value={form.transaction_method_id || ""}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    transaction_method_id:
                      event.target.value === "" ? "" : String(event.target.value),
                  }))
                }
              >
                {groupedTransactionMethodsForSelect(
                  transactionMethods.filter((m) => m.status === "active"),
                ).flatMap((group) => [
                  <ListSubheader key={`oi-tm-${group.kind}`} sx={{ fontWeight: 700 }}>
                    {group.label}
                  </ListSubheader>,
                  ...group.methods.map((m) => {
                    const sub = [m.bank_name, m.account_or_phone]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <MenuItem key={m.id} value={String(m.id)}>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            py: 0.25,
                          }}
                        >
                          <Typography variant="body2">{m.name}</Typography>
                          {sub ? (
                            <Typography variant="caption" color="text.secondary">
                              {sub}
                            </Typography>
                          ) : null}
                        </Box>
                      </MenuItem>
                    );
                  }),
                ])}
              </Select>
            </FormControl>
            <TextField
              label="Reference Number"
              value={form.reference_number}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, reference_number: event.target.value }))
              }
              fullWidth
            />
          </Stack>

          <TextField
            label="Description"
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
            multiline
            minRows={3}
            fullWidth
          />

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Button variant="text" onClick={() => void handleCancel()}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => void submit()}
              disabled={
                saving ||
                !form.chart_of_account_id ||
                !String(form.transaction_method_id || "").trim() ||
                !Number.isFinite(amountNum) ||
                amountNum <= 0
              }
            >
              {isEdit ? "Save Changes" : "Create Income"}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
