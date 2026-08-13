import { useMemo, useState } from "react";
import Autocomplete, { createFilterOptions } from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import ChartOfAccountDialog from "./ChartOfAccountDialog";
import {
  createChartOfAccount,
  listChartOfAccounts,
} from "../../services/financeService";
import useToastStore from "../../stores/toastStore";
import { resolveApiError } from "../../services/apiClient";

const ADD_COA_SENTINEL = {
  __addCoa: true,
  id: "__add_coa__",
};

const filterAccounts = createFilterOptions({
  stringify: (option) =>
    option.__addCoa ? "" : `${option.code ?? ""} ${option.name ?? ""}`.trim(),
});

export default function ChartOfAccountPicker({
  accounts,
  value,
  onChange,
  onAccountsChange,
  listParams = {},
  dialogDefaultType = "income",
  label = "Chart of Account",
  disabled = false,
  required = false,
  size = "small",
  fullWidth = true,
}) {
  const { pushToast } = useToastStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selected = useMemo(
    () => accounts.find((row) => String(row.id) === String(value)) ?? null,
    [accounts, value],
  );

  const refreshAccounts = async () => {
    try {
      const next = await listChartOfAccounts(listParams);
      const rows = Array.isArray(next) ? next : [];
      onAccountsChange?.(rows);
      return rows;
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not refresh chart of accounts."),
        severity: "error",
      });
      return null;
    }
  };

  const handleCreateCoa = async (payload) => {
    setSubmitting(true);
    try {
      const created = await createChartOfAccount({
        ...payload,
        type: dialogDefaultType,
      });
      await refreshAccounts();
      onChange(String(created.id));
      setDialogOpen(false);
      pushToast({
        message: "New chart of account added.",
        severity: "success",
      });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not add chart of account."),
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const autocompleteSlotProps = {
    paper: {
      sx: {
        bgcolor: "background.default",

        borderRadius: 1,
      },
    },
  };

  return (
    <>
      <Autocomplete
        slotProps={autocompleteSlotProps}
        disabled={disabled}
        fullWidth={fullWidth}
        size={size}
        options={[ADD_COA_SENTINEL, ...accounts]}
        value={selected}
        onChange={(_, option) => {
          if (!option) {
            onChange("");
            return;
          }
          if (option.__addCoa) {
            setDialogOpen(true);
            return;
          }
          onChange(String(option.id));
        }}
        getOptionLabel={(option) => {
          if (!option || option.__addCoa) return "";
          const code = option.code ? `${option.code} — ` : "";
          return `${code}${option.name ?? ""}`;
        }}
        isOptionEqualToValue={(a, b) => String(a?.id) === String(b?.id)}
        filterOptions={(options, params) => {
          const core = options.filter((o) => !o.__addCoa);
          const filtered = filterAccounts(core, params);
          return [ADD_COA_SENTINEL, ...filtered];
        }}
        renderOption={(props, option) => {
          const { key, ...rest } = props;
          if (option.__addCoa) {
            return (
              <li key={key} {...rest} style={{ fontWeight: 600 }}>
                Add chart of account
              </li>
            );
          }
          return (
            <li key={key} {...rest}>
              {(option.code ? `${option.code} — ` : "") + (option.name ?? "")}
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            required={required}
            placeholder="Search or choose…"
          />
        )}
      />

      <ChartOfAccountDialog
        key={dialogOpen ? "coa-dialog-open" : "coa-dialog-closed"}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleCreateCoa}
        submitting={submitting}
        defaultType={dialogDefaultType}
      />
    </>
  );
}
