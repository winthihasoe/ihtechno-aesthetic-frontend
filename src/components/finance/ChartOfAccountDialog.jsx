import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from "@mui/material";
import { ACCOUNT_TYPES_DIALOG } from "./financeAccountTypes";
import { useFinanceTokens } from "./financeTokens";

function initForm(account, defaultType = "income") {
  return {
    name: account?.name ?? "",
    code: account?.code ?? "",
    memo: account?.memo ?? "",
    type: account?.type ?? defaultType,
    is_active: account?.is_active ?? true,
  };
}

export default function ChartOfAccountDialog({
  open,
  onClose,
  onSubmit,
  account = null,
  submitting = false,
  defaultType = "income",
}) {
  const [form, setForm] = useState(() => initForm(account, defaultType));
  const { compactFieldSx } = useFinanceTokens();
  const isEdit = Boolean(account?.id);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.({
      ...form,
      name: form.name.trim(),
      code: form.code.trim(),
      memo: form.memo.trim() || null,
    });
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEdit ? "Edit Chart of Account" : "Add Chart of Account"}</DialogTitle>
      <DialogContent>
        <Stack component="form" onSubmit={handleSubmit} spacing={2} sx={{ mt: 1 }}>
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
            helperText="Leave empty to auto-generate."
            sx={compactFieldSx}
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
                  setForm((prev) => ({ ...prev, is_active: event.target.checked }))
                }
                disabled={Boolean(account?.is_system)}
              />
            }
            label="Active"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={submitting || !form.name.trim()}
        >
          {isEdit ? "Save" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
