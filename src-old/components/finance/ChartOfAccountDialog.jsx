import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Link,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { ACCOUNT_TYPES_DIALOG } from "./financeAccountTypes";
import { financeCoaCodeSx, useFinanceTokens } from "./financeTokens";
import { formatKyats } from "../../utils/formatKyats";
import {
  formatCommaAmountFromNumber,
  parseCommaAmount,
  sanitizeCommaAmountInput,
} from "../../utils/amountInputUtils";
import { getFixedAssetOpeningBalanceByCoa } from "../../services/financeService";
import {
  isFixedAssetAccumDepCode,
  isFixedAssetCostCode,
  isFixedAssetRegisterManagedCode,
} from "../../utils/fixedAssetCoaCodes";

const BALANCE_SHEET_TYPES = new Set(["asset", "liability", "equity"]);

function initForm(account, defaultType = "income", defaultOpeningDate = "") {
  return {
    name: account?.name ?? "",
    code: account?.code ?? "",
    memo: account?.memo ?? "",
    type: account?.type ?? defaultType,
    is_active: account?.is_active ?? true,
    opening_balance_amount:
      account?.opening_balance_amount != null
        ? formatCommaAmountFromNumber(account.opening_balance_amount)
        : "",
    opening_balance_date:
      account?.opening_balance_date ?? defaultOpeningDate ?? "",
  };
}

export default function ChartOfAccountDialog({
  open,
  onClose,
  onSubmit,
  onPostOpeningBalance,
  account = null,
  submitting = false,
  postingOpeningBalance = false,
  defaultType = "income",
  codeHelperText = "Leave empty to auto-generate.",
  openingBalanceWindowOpen = false,
  defaultOpeningDate = "",
  rolePrefix = "",
}) {
  const [form, setForm] = useState(() =>
    initForm(account, defaultType, defaultOpeningDate),
  );
  const [registerRow, setRegisterRow] = useState(null);
  const { compactFieldSx } = useFinanceTokens();
  const isEdit = Boolean(account?.id);
  const isBalanceSheet = BALANCE_SHEET_TYPES.has(form.type);
  const isPosted = Boolean(account?.opening_balance_journal_entry_id);
  const isRegisterManaged = isFixedAssetRegisterManagedCode(account?.code);
  const showOpeningBalance =
    isEdit && isBalanceSheet && account?.code !== "30000";
  const showSubledgerWarning =
    showOpeningBalance &&
    !isRegisterManaged &&
    (account?.is_prepaid_account || account?.is_fixed_asset_account);
  const isRetainedEarningsAccount = account?.code === "32100";

  useEffect(() => {
    if (!open || !isRegisterManaged) {
      setRegisterRow(null);
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        const summary = await getFixedAssetOpeningBalanceByCoa();
        const row = (summary?.accounts ?? []).find(
          (item) => item.code === account?.code,
        );
        if (!cancelled) {
          setRegisterRow(row ?? null);
        }
      } catch {
        if (!cancelled) {
          setRegisterRow(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, isRegisterManaged, account?.code]);

  const registerLabel = useMemo(() => {
    if (isFixedAssetCostCode(account?.code)) {
      return "gross historical cost";
    }
    if (isFixedAssetAccumDepCode(account?.code)) {
      return "accumulated depreciation";
    }
    return "opening balance";
  }, [account?.code]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.({
      name: form.name.trim(),
      code: form.code.trim(),
      memo: form.memo.trim() || null,
      type: form.type,
      is_active: form.is_active,
    });
  };

  const openingBalanceAmount = parseCommaAmount(form.opening_balance_amount);

  const handlePostOpeningBalance = async () => {
    if (!Number.isFinite(openingBalanceAmount) || openingBalanceAmount <= 0)
      return;
    if (!form.opening_balance_date) return;

    await onPostOpeningBalance?.({
      amount: openingBalanceAmount,
      opening_balance_date: form.opening_balance_date,
    });
  };

  const journalEntry = account?.opening_balance_journal_entry;
  const fixedAssetsHref = rolePrefix
    ? `${rolePrefix}/finance/fixed-assets`
    : null;

  return (
    <Dialog
      open={open}
      onClose={submitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>
        {isEdit ? "Edit Chart of Account" : "Add Chart of Account"}
      </DialogTitle>
      <DialogContent>
        <Stack
          component="form"
          onSubmit={handleSubmit}
          spacing={2}
          sx={{ mt: 1 }}
        >
          <TextField
            label="Account Name"
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
            required
            autoFocus
            sx={compactFieldSx}
          />
          <TextField
            label="Account Code (optional)"
            value={form.code}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, code: event.target.value }))
            }
            helperText={codeHelperText}
            sx={{ ...compactFieldSx, ...financeCoaCodeSx }}
          />
          <TextField
            label="Memo"
            value={form.memo}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, memo: event.target.value }))
            }
            multiline
            minRows={2}
            placeholder="Optional notes about this account"
            sx={compactFieldSx}
          />
          <TextField
            select
            label="Account Type"
            value={form.type}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, type: event.target.value }))
            }
            disabled={Boolean(account?.is_system)}
            sx={compactFieldSx}
          >
            {ACCOUNT_TYPES_DIALOG.map((item) => (
              <MenuItem key={item.value} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(form.is_active)}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    is_active: event.target.checked,
                  }))
                }
                disabled={Boolean(account?.is_system)}
              />
            }
            label="Active"
          />

          {showOpeningBalance ? (
            <Stack spacing={1.5} sx={{ pt: 0.5 }}>
              <Typography variant="subtitle2" fontWeight={700}>
                Opening balance migration
              </Typography>
              {!openingBalanceWindowOpen && !isPosted && !isRegisterManaged ? (
                <Alert severity="info">
                  The COA opening-balance migration window is closed.
                </Alert>
              ) : null}
              {isRegisterManaged ? (
                <Alert severity="info">
                  Opening balance for this account is set automatically from
                  the Fixed Asset register ({registerLabel}). Import opening-balance
                  assets on the Fixed Assets page — totals update as you add rows.
                  {fixedAssetsHref ? (
                    <>
                      {" "}
                      <Link
                        component={RouterLink}
                        to={fixedAssetsHref}
                        underline="hover"
                      >
                        Open Fixed Assets
                      </Link>
                    </>
                  ) : null}
                </Alert>
              ) : null}
              {showSubledgerWarning && !isPosted ? (
                <Alert severity="warning">
                  This account may already be covered by Prepaid or Fixed Asset
                  opening-balance import — confirm to avoid double-counting.
                </Alert>
              ) : null}
              {isRetainedEarningsAccount && !isPosted ? (
                <Alert severity="info">
                  Post prior-system accumulated profit / retained earnings here at
                  cutover. Current-year activity still rolls into Net income on the
                  Balance Sheet separately.
                </Alert>
              ) : null}
              {isRegisterManaged && registerRow ? (
                <Typography variant="body2" color="text.secondary">
                  Register total:{" "}
                  <strong>{formatKyats(Number(registerRow.register_total ?? 0))}</strong>
                  {registerRow.asset_count != null
                    ? ` from ${registerRow.asset_count} asset(s)`
                    : ""}
                  {registerRow.is_synced ? " · synced to ledger" : " · pending sync"}
                </Typography>
              ) : null}
              {isPosted ? (
                <Alert severity="success">
                  Opening balance posted
                  {account.opening_balance_amount != null
                    ? `: ${formatKyats(Number(account.opening_balance_amount))}`
                    : ""}
                  {account.opening_balance_date
                    ? ` as of ${account.opening_balance_date}`
                    : ""}
                  .
                  {journalEntry?.id && rolePrefix ? (
                    <>
                      {" "}
                      <Link
                        component={RouterLink}
                        to={`${rolePrefix}/finance/journal-entries?highlight=${journalEntry.id}`}
                        underline="hover"
                      >
                        View journal{" "}
                        {journalEntry.journal_no ?? `#${journalEntry.id}`}
                      </Link>
                    </>
                  ) : null}
                </Alert>
              ) : isRegisterManaged ? null : (
                <>
                  <TextField
                    label="Opening balance amount"
                    value={form.opening_balance_amount}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        opening_balance_amount: sanitizeCommaAmountInput(
                          event.target.value,
                        ),
                      }))
                    }
                    inputProps={{ inputMode: "decimal" }}
                    placeholder="e.g. 100,000"
                    helperText="Enter the balance from your QuickBooks trial balance (positive amount)."
                    disabled={!openingBalanceWindowOpen}
                    sx={compactFieldSx}
                  />
                  <TextField
                    label="As-of date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={form.opening_balance_date}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        opening_balance_date: event.target.value,
                      }))
                    }
                    disabled={!openingBalanceWindowOpen}
                    sx={compactFieldSx}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Posts Dr/Cr against Opening Balance Equity (30000). Income
                    and expense accounts are not migrated here.
                  </Typography>
                </>
              )}
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={onClose}
          disabled={submitting || postingOpeningBalance}
        >
          Cancel
        </Button>
        {showOpeningBalance &&
        !isPosted &&
        !isRegisterManaged &&
        openingBalanceWindowOpen ? (
          <Button
            onClick={handlePostOpeningBalance}
            variant="outlined"
            disabled={
              postingOpeningBalance ||
              submitting ||
              !Number.isFinite(openingBalanceAmount) ||
              openingBalanceAmount <= 0 ||
              !form.opening_balance_date
            }
          >
            Post opening balance
          </Button>
        ) : null}
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting || postingOpeningBalance || !form.name.trim()}
        >
          {isEdit ? "Save" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
