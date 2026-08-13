import { useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import ChartOfAccountPicker from "./ChartOfAccountPicker";
import {
  createPrepaidExpenseType,
  listChartOfAccounts,
} from "../../services/financeService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";

const ADD_NEW_VALUE = "__add_new__";

function mergeTypes(types, extraTypes) {
  const byId = new Map();
  for (const type of types) {
    byId.set(String(type.id), type);
  }
  for (const type of extraTypes) {
    byId.set(String(type.id), type);
  }
  return [...byId.values()].sort((a, b) =>
    String(a.name ?? "").localeCompare(String(b.name ?? "")),
  );
}

export default function PrepaidExpenseTypePicker({
  label = "Prepaid type",
  value,
  onChange,
  types = [],
  onCreated,
  disabled = false,
  required = false,
  size = "small",
}) {
  const { pushToast } = useToastStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [prepaidAccountId, setPrepaidAccountId] = useState("");
  const [expenseAccountId, setExpenseAccountId] = useState("");
  const [prepaidAccounts, setPrepaidAccounts] = useState([]);
  const [expenseAccounts, setExpenseAccounts] = useState([]);
  const [extraTypes, setExtraTypes] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [saving, setSaving] = useState(false);

  const displayTypes = useMemo(
    () => mergeTypes(types, extraTypes),
    [types, extraTypes],
  );

  useEffect(() => {
    if (!dialogOpen) return;

    let cancelled = false;
    setLoadingAccounts(true);
    (async () => {
      try {
        const [prepaidRows, expenseRows] = await Promise.all([
          listChartOfAccounts({ is_prepaid_account: true, is_active: true }),
          listChartOfAccounts({ type: "expense", is_active: true }),
        ]);
        if (cancelled) return;
        setPrepaidAccounts(Array.isArray(prepaidRows) ? prepaidRows : []);
        setExpenseAccounts(Array.isArray(expenseRows) ? expenseRows : []);
      } catch (error) {
        if (!cancelled) {
          pushToast({
            message: resolveApiError(error, "Could not load chart of accounts."),
            severity: "error",
          });
          setPrepaidAccounts([]);
          setExpenseAccounts([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingAccounts(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dialogOpen, pushToast]);

  const resetDialog = () => {
    setNewName("");
    setPrepaidAccountId("");
    setExpenseAccountId("");
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
    resetDialog();
  };

  const createType = async () => {
    if (!newName.trim() || !prepaidAccountId || !expenseAccountId) return;

    setSaving(true);
    try {
      const created = await createPrepaidExpenseType({
        name: newName.trim(),
        prepaid_account_id: Number(prepaidAccountId),
        expense_account_id: Number(expenseAccountId),
      });
      setExtraTypes((prev) => {
        if (prev.some((row) => String(row.id) === String(created.id))) {
          return prev;
        }
        return [...prev, created];
      });
      await onCreated?.(created);
      onChange?.(String(created.id));
      pushToast({ message: "Prepaid type added.", severity: "success" });
      closeDialog();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to add prepaid type."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <FormControl fullWidth size={size} required={required} disabled={disabled}>
        <InputLabel id="prepaid-type-label">{label}</InputLabel>
        <Select
          labelId="prepaid-type-label"
          label={label}
          value={value || ""}
          onChange={(event) => {
            if (event.target.value === ADD_NEW_VALUE) {
              setDialogOpen(true);
              return;
            }
            onChange?.(String(event.target.value));
          }}
        >
          {displayTypes.map((type) => (
            <MenuItem key={type.id} value={String(type.id)}>
              {type.name}
              {type.prepaid_account?.code
                ? ` (${type.prepaid_account.code})`
                : ""}
            </MenuItem>
          ))}
          <ListSubheader disableSticky />
          <MenuItem value={ADD_NEW_VALUE}>
            <Stack direction="row" spacing={1} alignItems="center">
              <AddIcon fontSize="small" />
              <span>Add new type...</span>
            </Stack>
          </MenuItem>
        </Select>
      </FormControl>

      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add prepaid type</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info" variant="outlined">
              Map a display name to the prepaid asset account and the expense
              account used when monthly amortization posts. New prepaid asset
              accounts are created under Prepaid Expenses (13000) with a 131xx
              code.
            </Alert>
            <TextField
              autoFocus
              size="small"
              label="Type name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              fullWidth
              placeholder="e.g. Marketing retainer"
            />
            <ChartOfAccountPicker
              label="Prepaid asset account"
              accounts={prepaidAccounts}
              value={prepaidAccountId}
              onChange={setPrepaidAccountId}
              onAccountsChange={setPrepaidAccounts}
              listParams={{ is_prepaid_account: true, is_active: true }}
              createParams={{ is_prepaid_account: true }}
              dialogDefaultType="asset"
              dialogCodeHelperText="Leave empty to auto-generate a 131xx code under Prepaid Expenses."
              disabled={loadingAccounts || saving}
              required
            />
            <ChartOfAccountPicker
              label="Amortization expense account"
              accounts={expenseAccounts}
              value={expenseAccountId}
              onChange={setExpenseAccountId}
              onAccountsChange={setExpenseAccounts}
              listParams={{ type: "expense", is_active: true }}
              dialogDefaultType="expense"
              disabled={loadingAccounts || saving}
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => void createType()}
            disabled={
              saving ||
              loadingAccounts ||
              !newName.trim() ||
              !prepaidAccountId ||
              !expenseAccountId
            }
          >
            {saving ? "Saving..." : "Add type"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
