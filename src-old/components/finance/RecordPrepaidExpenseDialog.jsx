import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import LoadingIndicator from "../common/LoadingIndicator";
import PrepaidExpenseRegistrationForm, {
  emptyPrepaidForm,
  serializePrepaidCashPayload,
  serializePrepaidOpeningBalancePayload,
} from "./PrepaidExpenseRegistrationForm";
import {
  createOpeningBalancePrepaid,
  createPrepaidExpense,
  listPrepaidExpenseTypes,
  suggestPrepaidCode,
} from "../../services/financeService";
import { getTransactionMethods } from "../../services/transactionMethodService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import { parseCommaAmount } from "../../utils/amountInputUtils";

export default function RecordPrepaidExpenseDialog({
  open,
  onClose,
  onSuccess,
  mode = "cash_payment",
}) {
  const { pushToast } = useToastStore();
  const theme = useTheme();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(() => emptyPrepaidForm(mode));
  const [types, setTypes] = useState([]);
  const [suggestedCode, setSuggestedCode] = useState("");
  const [openingWindowOpen, setOpeningWindowOpen] = useState(false);
  const [transactionMethods, setTransactionMethods] = useState([]);

  useEffect(() => {
    if (!open) return;
    setForm(emptyPrepaidForm(mode));
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    (async () => {
      try {
        const [typeRows, codeHint, methods] = await Promise.all([
          listPrepaidExpenseTypes().catch(() => []),
          suggestPrepaidCode().catch(() => ({})),
          getTransactionMethods().catch(() => []),
        ]);
        if (cancelled) return;

        setTypes(Array.isArray(typeRows) ? typeRows : []);
        setSuggestedCode(codeHint?.prepaid_code ?? "");
        setOpeningWindowOpen(Boolean(codeHint?.opening_balance_window_open));

        const methodList = Array.isArray(methods) ? methods : [];
        setTransactionMethods(methodList);
        setForm((prev) => {
          const next = { ...prev };
          if (!next.prepaid_code && codeHint?.prepaid_code) {
            next.prepaid_code = codeHint.prepaid_code;
          }
          if (!String(next.transaction_method_id || "").trim()) {
            const cash = methodList.find(
              (row) => row.is_system && row.ledger_kind === "cash",
            );
            if (cash) next.transaction_method_id = String(cash.id);
          }
          return next;
        });
      } catch (error) {
        if (!cancelled) {
          pushToast({
            message: resolveApiError(
              error,
              "Could not load prepaid form options.",
            ),
            severity: "error",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, pushToast]);

  const handleClose = () => {
    if (saving) return;
    onClose?.();
  };

  const submit = async () => {
    const isOpening = form.mode === "opening_balance";
    if (!String(form.prepaid_expense_type_id || "").trim()) {
      pushToast({ message: "Select a prepaid type.", severity: "warning" });
      return;
    }
    if (isOpening) {
      if (
        !String(form.reference_number || "").trim() ||
        !String(form.remaining_months || "").trim()
      ) {
        pushToast({
          message: "Enter old-system reference and remaining months.",
          severity: "warning",
        });
        return;
      }
      const remaining = parseCommaAmount(form.remaining_balance);
      if (!Number.isFinite(remaining) || remaining <= 0) {
        pushToast({
          message: "Enter a valid remaining balance.",
          severity: "warning",
        });
        return;
      }
    } else {
      const amount = parseCommaAmount(form.amount);
      if (
        !form.payment_date ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !String(form.transaction_method_id || "").trim()
      ) {
        pushToast({
          message: "Enter payment date, amount, and paid-from method.",
          severity: "warning",
        });
        return;
      }
    }

    setSaving(true);
    try {
      const idem = `prepaid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      if (isOpening) {
        await createOpeningBalancePrepaid(
          serializePrepaidOpeningBalancePayload(form),
          idem,
        );
        pushToast({
          message:
            "Opening balance prepaid recorded and posted to the ledger (Dr Prepaid / Cr Opening Balance Equity).",
          severity: "success",
        });
      } else {
        await createPrepaidExpense(serializePrepaidCashPayload(form), idem);
        pushToast({
          message:
            "Prepaid expense recorded. Post it from Transactions to update the ledger and cash outflows.",
          severity: "success",
        });
      }
      onClose?.();
      await onSuccess?.();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not save prepaid expense."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const modeSegmentSx = {
    display: "flex",
    width: "100%",
    p: 0.5,
    gap: 0.5,
    borderRadius: 1,
    bgcolor: alpha(theme.palette.primary.main, 0.09),
    border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
    "& .MuiToggleButtonGroup-grouped": {
      flex: 1,
      mx: 0,
      border: 0,
      borderRadius: "10px !important",
      "&:not(:first-of-type)": {
        borderRadius: "10px !important",
        borderLeft: 0,
        marginLeft: 0,
      },
      "&:first-of-type": {
        borderRadius: "10px !important",
      },
    },
    "& .MuiToggleButton-root": {
      flex: 1,
      py: 1.15,
      px: 1.5,
      textTransform: "none",
      fontWeight: 600,
      fontSize: "0.875rem",
      lineHeight: 1.4,
      color: theme.palette.text.secondary,
      border: 0,
      transition: theme.transitions.create(
        ["background-color", "color", "box-shadow"],
        { duration: theme.transitions.duration.short },
      ),
      "&:hover": {
        bgcolor: alpha(theme.palette.primary.main, 0.06),
      },
      "&.Mui-selected": {
        bgcolor: theme.palette.background.paper,
        color: theme.palette.primary.main,
        boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.08)}, 0 2px 8px ${alpha(theme.palette.primary.main, 0.18)}`,
        "&:hover": {
          bgcolor: theme.palette.background.paper,
        },
      },
      "&.Mui-disabled": {
        opacity: 0.42,
        border: 0,
      },
    },
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 800, pb: 1.5 }}>
        Record prepaid expense
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <ToggleButtonGroup
          exclusive
          value={form.mode}
          onChange={(_, value) => {
            if (value) setForm((prev) => ({ ...prev, mode: value }));
          }}
          sx={modeSegmentSx}
        >
          <ToggleButton value="cash_payment">New payment</ToggleButton>
          <ToggleButton value="opening_balance" disabled={!openingWindowOpen}>
            Migrate opening balance
          </ToggleButton>
        </ToggleButtonGroup>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 1.5, lineHeight: 1.5 }}
        >
          {form.mode === "opening_balance"
            ? "Old-system carry-forward: remaining unamortized balance and months left only — not the original payment. Posts to Opening Balance Equity; no cash."
            : "New advance payment: full amount paid today. Saves pending — post from Transactions to record cash and the prepaid asset."}
        </Typography>

        <Box sx={{ mt: 2 }}>
          <PrepaidExpenseRegistrationForm
            form={form}
            onChange={setForm}
            types={types}
            transactionMethods={transactionMethods}
            suggestedCode={suggestedCode}
            openingWindowOpen={openingWindowOpen}
            showModeToggle={false}
            onTypeCreated={(created) => {
              setTypes((prev) => {
                const list = Array.isArray(prev) ? prev : [];
                if (list.some((row) => String(row.id) === String(created.id))) {
                  return list;
                }
                return [...list, created].sort((a, b) =>
                  String(a.name ?? "").localeCompare(String(b.name ?? "")),
                );
              });
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void submit()}
          disabled={saving}
        >
          {saving ? (
            <LoadingIndicator size={22} />
          ) : form.mode === "opening_balance" ? (
            "Save opening balance"
          ) : (
            "Save prepaid expense"
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
