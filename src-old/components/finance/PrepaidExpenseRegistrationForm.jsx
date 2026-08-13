import {
  Alert,
  FormControl,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Box,
} from "@mui/material";
import dayjs from "dayjs";
import PrepaidExpenseTypePicker from "./PrepaidExpenseTypePicker";
import { groupedTransactionMethodsForSelect } from "../../utils/financialLedgerKindUtils";
import {
  parseCommaAmount,
  sanitizeCommaAmountInput,
} from "../../utils/amountInputUtils";

export function emptyPrepaidForm(mode = "cash_payment") {
  const today = dayjs().format("YYYY-MM-DD");
  const endOfYear = dayjs().endOf("year").format("YYYY-MM-DD");
  return {
    mode,
    prepaid_code: "",
    vendor_name: "",
    reference_number: "",
    description: "",
    prepaid_expense_type_id: "",
    amount: "",
    original_amount: "",
    remaining_balance: "",
    remaining_months: "",
    payment_date: today,
    opening_balance_date: today,
    coverage_start: today,
    coverage_end: endOfYear,
    transaction_method_id: "",
  };
}

export function serializePrepaidCashPayload(form) {
  const amount = parseCommaAmount(form.amount);
  return {
    prepaid_code: String(form.prepaid_code ?? "").trim() || undefined,
    vendor_name: String(form.vendor_name ?? "").trim() || null,
    reference_number: String(form.reference_number ?? "").trim() || null,
    description: String(form.description ?? "").trim() || null,
    prepaid_expense_type_id: Number(form.prepaid_expense_type_id),
    amount,
    payment_date: form.payment_date,
    coverage_start: form.coverage_start,
    coverage_end: form.coverage_end,
    transaction_method_id: Number(form.transaction_method_id),
  };
}

export function serializePrepaidOpeningBalancePayload(form) {
  const remainingBalance = parseCommaAmount(form.remaining_balance);
  const originalAmount = parseCommaAmount(form.original_amount);
  return {
    prepaid_code: String(form.prepaid_code ?? "").trim() || undefined,
    vendor_name: String(form.vendor_name ?? "").trim() || null,
    reference_number: String(form.reference_number ?? "").trim(),
    description: String(form.description ?? "").trim() || null,
    prepaid_expense_type_id: Number(form.prepaid_expense_type_id),
    original_amount: Number.isFinite(originalAmount) ? originalAmount : undefined,
    remaining_balance: remainingBalance,
    remaining_months: Number(form.remaining_months),
    coverage_start: form.coverage_start,
    coverage_end: form.coverage_end,
    opening_balance_date: form.opening_balance_date,
    is_opening_balance: true,
  };
}

export default function PrepaidExpenseRegistrationForm({
  form,
  onChange,
  types = [],
  transactionMethods = [],
  suggestedCode = "",
  openingWindowOpen = false,
  showModeToggle = true,
  onTypeCreated,
}) {
  const setField = (key, value) => {
    onChange((prev) => ({ ...prev, [key]: value }));
  };

  const isOpening = form.mode === "opening_balance";

  return (
    <Stack spacing={2}>
      {showModeToggle ? (
        <ToggleButtonGroup
          exclusive
          size="small"
          value={form.mode}
          onChange={(_, value) => {
            if (value) setField("mode", value);
          }}
        >
          <ToggleButton value="cash_payment">New payment</ToggleButton>
          <ToggleButton value="opening_balance" disabled={!openingWindowOpen}>
            Migrate opening balance
          </ToggleButton>
        </ToggleButtonGroup>
      ) : null}

      {showModeToggle ? (
        isOpening ? (
          <Alert severity="warning" variant="outlined">
            Post only the remaining unamortized balance against Opening Balance
            Equity — never route migration through cash or the expense register.
          </Alert>
        ) : (
          <Alert severity="info" variant="outlined">
            Saves a pending cash outflow for accounting review. Post from
            Transactions to debit the prepaid asset and credit the paid-from
            method. P&amp;L is unaffected until monthly amortization runs.
          </Alert>
        )
      ) : null}

      <TextField
        label="Prepaid code"
        size="small"
        fullWidth
        placeholder={suggestedCode || "PE-YYYY-0001"}
        value={form.prepaid_code}
        onChange={(e) => setField("prepaid_code", e.target.value)}
      />

      <TextField
        label="Vendor / payee"
        size="small"
        fullWidth
        value={form.vendor_name}
        onChange={(e) => setField("vendor_name", e.target.value)}
      />

      <TextField
        label={isOpening ? "Old system reference" : "Reference #"}
        size="small"
        fullWidth
        required={isOpening}
        value={form.reference_number}
        onChange={(e) => setField("reference_number", e.target.value)}
      />

      <PrepaidExpenseTypePicker
        value={form.prepaid_expense_type_id}
        onChange={(id) => setField("prepaid_expense_type_id", id)}
        types={types}
        onCreated={onTypeCreated}
        required
      />

      {isOpening ? (
        <>
          <TextField
            label="Cutover date"
            type="date"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={form.opening_balance_date}
            onChange={(e) => setField("opening_balance_date", e.target.value)}
          />
          <TextField
            label="Original amount (informational)"
            size="small"
            fullWidth
            value={form.original_amount}
            onChange={(e) =>
              setField("original_amount", sanitizeCommaAmountInput(e.target.value))
            }
            placeholder="Optional — full premium before migration"
          />
          <TextField
            label="Remaining balance"
            size="small"
            fullWidth
            required
            value={form.remaining_balance}
            onChange={(e) =>
              setField(
                "remaining_balance",
                sanitizeCommaAmountInput(e.target.value),
              )
            }
          />
          <TextField
            label="Remaining months"
            type="number"
            size="small"
            fullWidth
            required
            inputProps={{ min: 1 }}
            value={form.remaining_months}
            onChange={(e) => setField("remaining_months", e.target.value)}
          />
        </>
      ) : (
        <>
          <TextField
            label="Transaction date"
            type="date"
            size="small"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={form.payment_date}
            onChange={(e) => setField("payment_date", e.target.value)}
          />
          <TextField
            label="Amount paid"
            size="small"
            fullWidth
            required
            value={form.amount}
            onChange={(e) =>
              setField("amount", sanitizeCommaAmountInput(e.target.value))
            }
          />
          <FormControl fullWidth size="small" required>
            <InputLabel id="prepaid-paid-from-label">Paid from</InputLabel>
            <Select
              labelId="prepaid-paid-from-label"
              label="Paid from"
              value={form.transaction_method_id || ""}
              onChange={(e) =>
                setField("transaction_method_id", String(e.target.value))
              }
            >
              {groupedTransactionMethodsForSelect(
                transactionMethods.filter((m) => m.status === "active"),
              ).flatMap((group) => [
                <ListSubheader key={`prepaid-tm-${group.kind}`} sx={{ fontWeight: 700 }}>
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
        </>
      )}

      <TextField
        label="Coverage start"
        type="date"
        size="small"
        fullWidth
        InputLabelProps={{ shrink: true }}
        value={form.coverage_start}
        onChange={(e) => setField("coverage_start", e.target.value)}
      />
      <TextField
        label="Coverage end"
        type="date"
        size="small"
        fullWidth
        InputLabelProps={{ shrink: true }}
        value={form.coverage_end}
        onChange={(e) => setField("coverage_end", e.target.value)}
      />

      <TextField
        label="Memo / description"
        size="small"
        fullWidth
        multiline
        minRows={2}
        value={form.description}
        onChange={(e) => setField("description", e.target.value)}
        placeholder={
          isOpening
            ? "Service period covered and audit notes"
            : "e.g. Insurance premium, Jul 2026–Jun 2027"
        }
      />
    </Stack>
  );
}
