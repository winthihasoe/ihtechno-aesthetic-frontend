import PrintIcon from "@mui/icons-material/Print";
import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  ListSubheader,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { InvoiceReceiptPreviewCard } from "../invoiceReceipt/InvoiceReceiptBlocks.jsx";
import { formatReceiptMoney } from "../../utils/invoiceReceiptUtils";
import { invoiceAmountDueBeforeNextPayment } from "../../utils/paymentDetailUtils";

const formatMoney = formatReceiptMoney;

export function PaymentDetailInvoicePreviewDialog({
  open,
  onClose,
  invoiceTerminal,
  canPrintReceipt = true,
  selectedTransactionMethodId,
  onSelectTransactionMethodId,
  receiveViaGrouped,
  paymentCollectionMode,
  onPaymentCollectionModeChange,
  partialPaymentAmount,
  onPartialPaymentAmountChange,
  partialDueDate,
  onPartialDueDateChange,
  totals,
  settings,
  payment,
  invoiceCustomerLine,
  lines,
  notes,
  receiptMeta,
  makingPayment,
  canCompletePayment,
  onPrintReceipt,
  onMakePaymentAndPrint,
}) {
  const amountDueBeforePayment = invoiceAmountDueBeforeNextPayment(
    payment,
    totals?.grand,
  );
  const remainingAfterThisPayment = Math.max(
    0,
    Number(
      (amountDueBeforePayment - Number(partialPaymentAmount || 0)).toFixed(2),
    ),
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pr: 1,
        }}
      >
        Invoice Preview
        <IconButton
          aria-label="Close invoice preview"
          onClick={onClose}
          edge="end"
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          bgcolor: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: 2,
        }}
      >
        <Stack spacing={2.5} direction="row">
          <Stack
            spacing={2.5}
            className="no-print"
            sx={{ py: 3, width: "100%" }}
          >
            <FormControl size="small" fullWidth disabled={invoiceTerminal}>
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={600}
                gutterBottom
                fontSize="0.8rem"
              >
                Receive Via:
              </Typography>
              <Select
                value={selectedTransactionMethodId ?? ""}
                onChange={(e) =>
                  onSelectTransactionMethodId(
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
              >
                {receiveViaGrouped.flatMap((group) => [
                  <ListSubheader
                    key={`tm-h-${group.kind}`}
                    sx={{ fontWeight: 700 }}
                  >
                    {group.label}
                  </ListSubheader>,
                  ...group.methods.map((m) => {
                    const sub = [m.bank_name, m.account_or_phone]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <MenuItem key={m.id} value={m.id}>
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
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
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

            <FormControl
              component="fieldset"
              variant="standard"
              disabled={invoiceTerminal}
              sx={{ mt: 0.5 }}
            >
              <FormLabel
                component="legend"
                sx={{ fontWeight: 600, fontSize: "0.8rem", mb: 0.5 }}
              >
                Payment
              </FormLabel>
              <RadioGroup
                row
                value={paymentCollectionMode}
                onChange={(e) => onPaymentCollectionModeChange(e.target.value)}
              >
                <FormControlLabel
                  value="full"
                  control={<Radio size="small" />}
                  label="Full payment"
                />
                <FormControlLabel
                  value="partial"
                  control={<Radio size="small" />}
                  label="Partial payment"
                />
              </RadioGroup>
            </FormControl>
          </Stack>
          <Stack spacing={2.5} sx={{ py: 3, width: "100%" }}>
            {paymentCollectionMode === "partial" && !invoiceTerminal && (
              <Stack spacing={1.5}>
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontWeight={600}
                    gutterBottom
                    fontSize="0.8rem"
                  >
                    Amount received:
                  </Typography>
                  <TextField
                    size="small"
                    type="number"
                    value={partialPaymentAmount}
                    onChange={(e) =>
                      onPartialPaymentAmountChange(e.target.value)
                    }
                    inputProps={{ min: 0, step: "0.01" }}
                    fullWidth
                  />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Remaining after this payment:{" "}
                  {formatMoney(remainingAfterThisPayment)}
                </Typography>
                {remainingAfterThisPayment > 0.005 && (
                  <Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      fontWeight={600}
                      gutterBottom
                      fontSize="0.8rem"
                    >
                      Due date
                    </Typography>
                    <TextField
                      size="small"
                      type="date"
                      value={partialDueDate}
                      onChange={(e) => onPartialDueDateChange(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                    />
                  </Box>
                )}
              </Stack>
            )}
          </Stack>
        </Stack>
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <InvoiceReceiptPreviewCard
            settings={settings}
            payment={payment}
            invoiceCustomerLine={invoiceCustomerLine}
            lines={lines}
            totals={totals}
            notes={notes}
            receiptMeta={receiptMeta}
            paymentCollectionMode={paymentCollectionMode}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          variant="outlined"
          startIcon={<PrintIcon />}
          disabled={!canPrintReceipt || makingPayment}
          onClick={onPrintReceipt}
        >
          Print receipt
        </Button>
        <Button
          variant="contained"
          color="success"
          disabled={invoiceTerminal || !canCompletePayment || makingPayment}
          onClick={onMakePaymentAndPrint}
        >
          {makingPayment ? "Processing..." : "Make payment & Print"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
