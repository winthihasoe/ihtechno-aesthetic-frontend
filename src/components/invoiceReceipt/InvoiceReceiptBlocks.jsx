import {
  Box,
  Divider,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { getClinicDisplayName } from "../../utils/clinicBranding";
import {
  computeLineSubtotalBeforeDiscount,
  computeLineTotal,
  computeRowDiscountTaken,
  formatReceiptMoney,
  formatRowDiscountCaption,
  labelForPrintedInvoice,
} from "../../utils/invoiceReceiptUtils";

/** New unsaved invoices use now; saved drafts/paid use created_at. */
function formatInvoiceHeaderDate(payment) {
  if (payment?.created_at) {
    return dayjs(payment.created_at).format("D MMM YYYY, HH:mm");
  }
  return dayjs().format("D MMM YYYY, HH:mm");
}

/**
 * Right-aligned payment lines under Grand Total (screen + print).
 * @param {object} props
 * @param {object|null} props.receiptMeta
 * @param {string} [props.paymentStatus]
 * @param {'full'|'partial'} [props.paymentCollectionMode]
 * @param {object} props.totals
 */
export function InvoiceReceiptPaymentSummaryRows({
  receiptMeta,
  paymentStatus,
  paymentCollectionMode = "full",
  totals,
}) {
  const st = String(paymentStatus || "").toLowerCase();
  const grand = Number(totals?.grand || 0);

  const rowSx = {
    display: "flex",
    justifyContent: "space-between",
    gap: 1,
    width: "100%",
  };

  if (st === "paid") {
    return (
      <Stack
        spacing={0.35}
        className="invoice-receipt-payment-summary"
        sx={{
          width: "100%",
          pt: 0.5,
          "& .MuiTypography-root": {
            fontSize: "0.75rem",
            lineHeight: 1.35,
          },
        }}
      >
        <Box sx={rowSx}>
          <Typography component="span" variant="body2" color="text.secondary">
            Amount paid
          </Typography>
          <Typography component="span" variant="body2" fontWeight={700}>
            {formatReceiptMoney(grand)}
          </Typography>
        </Box>
      </Stack>
    );
  }

  const showPartialPreview =
    paymentCollectionMode === "partial" &&
    st !== "paid" &&
    st !== "void" &&
    receiptMeta?.paymentMode === "partial";

  const showSavedPartial =
    st === "partial" && receiptMeta?.paymentMode === "partial";

  if (!showPartialPreview && !showSavedPartial) return null;

  const partialAmt = receiptMeta?.partialAmount;
  const remaining = receiptMeta?.remainingAmount;
  const due = receiptMeta?.dueDateLabel;

  if (
    (partialAmt == null || !Number.isFinite(partialAmt) || partialAmt <= 0) &&
    (remaining == null || !Number.isFinite(remaining)) &&
    !due
  ) {
    return null;
  }

  return (
    <Stack
      spacing={0.35}
      className="invoice-receipt-payment-summary"
      sx={{
        width: "100%",
        pt: 0.5,
        "& .MuiTypography-root": {
          fontSize: "0.75rem",
          lineHeight: 1.35,
        },
      }}
    >
      {partialAmt != null && Number.isFinite(partialAmt) && partialAmt > 0 && (
        <Box sx={rowSx}>
          <Typography component="span" variant="body2" color="text.secondary">
            Amount received
          </Typography>
          <Typography component="span" variant="body2" fontWeight={600}>
            {formatReceiptMoney(partialAmt)}
          </Typography>
        </Box>
      )}
      {remaining != null && Number.isFinite(remaining) && (
        <Box sx={rowSx}>
          <Typography component="span" variant="body2" color="text.secondary">
            Balance due
          </Typography>
          <Typography component="span" variant="body2" fontWeight={600}>
            {formatReceiptMoney(remaining)}
          </Typography>
        </Box>
      )}
      {due ? (
        <Box sx={rowSx}>
          <Typography component="span" variant="body2" color="text.secondary">
            Due date
          </Typography>
          <Typography component="span" variant="body2" fontWeight={600}>
            {due}
          </Typography>
        </Box>
      ) : null}
    </Stack>
  );
}

export function InvoiceReceiptTotalsFooter({ totals }) {
  const orderDisc = Number(totals.order_discount || 0);
  const showOrderDiscount = orderDisc > 0;
  return (
    <Stack
      className="invoice-receipt-totals"
      spacing={0.4}
      sx={{
        width: "100%",
        "& .MuiTypography-root": {
          fontSize: "0.75rem",
          lineHeight: 1.35,
        },
        "& .invoice-receipt-totals-grand .MuiTypography-root": {
          fontSize: "0.8125rem",
          fontWeight: 700,
        },
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography component="span" variant="body2">
          Consultation
        </Typography>
        <Typography component="span" variant="body2">
          {formatReceiptMoney(totals.consultation)}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography component="span" variant="body2">
          Treatment
        </Typography>
        <Typography component="span" variant="body2">
          {formatReceiptMoney(totals.treatment)}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography component="span" variant="body2">
          Package
        </Typography>
        <Typography component="span" variant="body2">
          {formatReceiptMoney(totals.package + totals.package_discount)}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between" }}>
        <Typography component="span" variant="body2">
          Product
        </Typography>
        <Typography component="span" variant="body2">
          {formatReceiptMoney(totals.product)}
        </Typography>
      </Box>
      {Number(totals.prescription || 0) > 0.005 && (
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography component="span" variant="body2">
            Prescription
          </Typography>
          <Typography component="span" variant="body2">
            {formatReceiptMoney(totals.prescription)}
          </Typography>
        </Box>
      )}
      {Number(totals.lab || 0) > 0.005 && (
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography component="span" variant="body2">
            Lab
          </Typography>
          <Typography component="span" variant="body2">
            {formatReceiptMoney(totals.lab)}
          </Typography>
        </Box>
      )}
      {Number(totals.other || 0) > 0.005 && (
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography component="span" variant="body2">
            Other
          </Typography>
          <Typography component="span" variant="body2">
            {formatReceiptMoney(totals.other)}
          </Typography>
        </Box>
      )}
      {showOrderDiscount && (
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <Typography component="span" variant="body2">
            Order discount
          </Typography>
          <Typography component="span" variant="body2">
            -{formatReceiptMoney(orderDisc)}
          </Typography>
        </Box>
      )}
      {Number(totals.tax || 0) > 0.005 && (
        <>
          <Box
            sx={{ display: "flex", justifyContent: "space-between", pt: 0.25 }}
          >
            <Typography component="span" variant="body2" color="text.secondary">
              Net (excl. tax)
            </Typography>
            <Typography component="span" variant="body2">
              {formatReceiptMoney(
                Number.isFinite(Number(totals.net_before_tax))
                  ? Number(totals.net_before_tax)
                  : Math.max(
                      0,
                      Number(totals.grand || 0) - Number(totals.tax || 0),
                    ),
              )}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography component="span" variant="body2" color="text.secondary">
              Tax
              {Number(totals.tax_percent) > 0
                ? ` (${Number(totals.tax_percent)}%)`
                : ""}
            </Typography>
            <Typography component="span" variant="body2">
              {formatReceiptMoney(totals.tax)}
            </Typography>
          </Box>
        </>
      )}
      <Box
        className="invoice-receipt-totals-grand"
        sx={{ display: "flex", justifyContent: "space-between", pt: 0.25 }}
      >
        <Typography fontWeight={700} component="span" variant="body2">
          Grand Total
        </Typography>
        <Typography fontWeight={700} component="span" variant="body2">
          {formatReceiptMoney(totals.grand)}
        </Typography>
      </Box>
    </Stack>
  );
}

function TotalsRightAlign({ children }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "flex-end",
        width: "100%",
      }}
    >
      <Box sx={{ width: "100%", maxWidth: { xs: "100%", sm: 250 } }}>
        {children}
      </Box>
    </Box>
  );
}

/**
 * @param {object} props
 * @param {object} props.settings
 * @param {object | null} props.payment
 * @param {string} props.invoiceCustomerLine
 * @param {boolean} [props.showExtendedHeader] — include email & website (matches main invoice paper)
 */
export function InvoiceReceiptHeader({
  settings,
  payment,
  invoiceCustomerLine,
  showExtendedHeader = true,
}) {
  return (
    <Box className="invoice-receipt-header" textAlign="center">
      <Typography variant="subtitle1" fontWeight={700}>
        {getClinicDisplayName(settings)}
      </Typography>
      {!!settings?.clinic_address && (
        <Typography variant="caption" display="block">
          {settings.clinic_address}
        </Typography>
      )}
      {!!settings?.clinic_phones?.length && (
        <Typography variant="caption" display="block">
          {settings.clinic_phones.join(", ")}
        </Typography>
      )}
      {showExtendedHeader && !!settings?.clinic_emails?.length && (
        <Typography variant="caption" display="block">
          {settings.clinic_emails.join(", ")}
        </Typography>
      )}
      {showExtendedHeader && !!settings?.clinic_website && (
        <Typography variant="caption" display="block">
          {settings.clinic_website}
        </Typography>
      )}
      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
        {formatInvoiceHeaderDate(payment)}
      </Typography>
      {payment?.invoice_number ? (
        <Typography
          variant="caption"
          display="block"
          fontWeight={700}
          sx={{ mt: 0.5 }}
        >
          {payment.invoice_number}
        </Typography>
      ) : (
        <Typography
          variant="caption"
          display="block"
          color="text.secondary"
          sx={{ mt: 0.5 }}
        >
          Draft — not issued
        </Typography>
      )}
      <Typography variant="caption" display="block" sx={{ mt: 0.75 }}>
        {invoiceCustomerLine}
      </Typography>
    </Box>
  );
}

/**
 * @param {'a5' | 'preview'} props.layout
 *   a5: 3 columns, first row shows net amount; optional discount sub-row (fits small paper).
 *   preview: 3 columns, first row shows gross (qty×price); discount sub-row with "Discount 10%".
 */
export function InvoiceReceiptLineTable({
  lines,
  layout,
  className,
  tableSize = "small",
}) {
  const isPreview = layout === "preview";
  const invoiceLines = Array.isArray(lines) ? lines : [];

  const body = invoiceLines.flatMap((line, index) => {
    const gross = computeLineSubtotalBeforeDiscount(line);
    const net = computeLineTotal(line);
    const discTaken = computeRowDiscountTaken(line);
    const caption = formatRowDiscountCaption(line);
    const showDisc = discTaken > 0.005;

    const firstAmount = isPreview ? gross : net;

    const rows = [
      <TableRow key={`${layout}-line-${index}`}>
        <TableCell
          sx={{
            px: 0.5,
            py: layout === "a5" ? 0.3 : 0.45,
            width: "56%",
            verticalAlign: "top",
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontSize: layout === "a5" ? "0.7rem" : undefined }}
          >
            {labelForPrintedInvoice(line)}
          </Typography>
        </TableCell>
        <TableCell
          sx={{
            px: 0.5,
            py: layout === "a5" ? 0.3 : 0.45,
            width: "12%",
            verticalAlign: "top",
          }}
          align="right"
        >
          <Typography
            variant="caption"
            sx={{ fontSize: layout === "a5" ? "0.7rem" : undefined }}
          >
            {line.qty ?? 1}
          </Typography>
        </TableCell>
        <TableCell
          sx={{
            px: 0.5,
            py: layout === "a5" ? 0.3 : 0.45,
            width: "32%",
            verticalAlign: "top",
          }}
          align="right"
        >
          <Typography
            variant="caption"
            sx={{ fontSize: layout === "a5" ? "0.7rem" : undefined }}
            fontWeight={isPreview ? 600 : 500}
          >
            {formatReceiptMoney(firstAmount)}
          </Typography>
        </TableCell>
      </TableRow>,
    ];

    if (showDisc) {
      const discLabel = caption ? `Discount ${caption}` : "Discount";
      rows.push(
        <TableRow key={`${layout}-line-${index}-disc`}>
          <TableCell
            sx={{
              px: 0.5,
              py: layout === "a5" ? 0.2 : 0.3,
              pl: layout === "preview" ? 1.5 : 1,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: layout === "a5" ? "0.68rem" : undefined }}
            >
              {discLabel}
            </Typography>
          </TableCell>
          <TableCell
            sx={{ px: 0.5, py: layout === "a5" ? 0.2 : 0.3 }}
            align="right"
          />
          <TableCell
            sx={{ px: 0.5, py: layout === "a5" ? 0.2 : 0.3 }}
            align="right"
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: layout === "a5" ? "0.68rem" : undefined }}
            >
              -{formatReceiptMoney(discTaken)}
            </Typography>
          </TableCell>
        </TableRow>,
      );
    }

    return rows;
  });

  const tableClass =
    layout === "a5"
      ? `invoice-receipt-lines invoice-receipt-lines--a5 ${className || ""}`
      : `invoice-receipt-lines invoice-receipt-lines--preview ${className || ""}`;

  return (
    <Table
      size={tableSize}
      className={tableClass.trim()}
      sx={
        layout === "a5"
          ? {
              tableLayout: "fixed",
              width: "100%",
              mt: 3,
            }
          : { tableLayout: "fixed", width: "100%", mt: 3 }
      }
    >
      <TableHead>
        <TableRow>
          <TableCell sx={{ px: 0.5, py: 0.4, width: "56%" }}>
            <Typography
              variant="caption"
              fontWeight={600}
              sx={{
                color: "text.secondary",
                fontSize: layout === "a5" ? "0.68rem" : undefined,
              }}
            >
              Label
            </Typography>
          </TableCell>
          <TableCell sx={{ px: 0.5, py: 0.4, width: "12%" }} align="right">
            <Typography
              variant="caption"
              fontWeight={600}
              sx={{
                color: "text.secondary",
                fontSize: layout === "a5" ? "0.68rem" : undefined,
              }}
            >
              Qty
            </Typography>
          </TableCell>
          <TableCell sx={{ px: 0.5, py: 0.4, width: "32%" }} align="right">
            <Typography
              variant="caption"
              fontWeight={600}
              sx={{
                color: "text.secondary",
                fontSize: layout === "a5" ? "0.68rem" : undefined,
              }}
            >
              Amount
            </Typography>
          </TableCell>
        </TableRow>
      </TableHead>
      <TableBody>{body}</TableBody>
    </Table>
  );
}

/**
 * @param {object} props
 * @param {null|{
 *   receiveViaLabel: string,
 *   paymentMode: 'full' | 'partial',
 *   partialAmount?: number | null,
 *   remainingAmount?: number | null,
 *   dueDateLabel?: string | null,
 * }} props.receiptMeta
 */
export function InvoiceReceiptPaymentMeta({ receiptMeta }) {
  if (!receiptMeta?.receiveViaLabel) return null;
  const modeLabel =
    receiptMeta.paymentMode === "partial" ? "Partial payment" : "Full payment";
  return (
    <Box sx={{ mt: 1, mb: 0.5 }}>
      <Typography variant="caption" display="block" fontWeight={600}>
        Receive via: {receiptMeta.receiveViaLabel}
      </Typography>
      <Typography variant="caption" display="block" color="text.secondary">
        {modeLabel}
        {receiptMeta.paymentMode === "partial" &&
          receiptMeta.partialAmount != null &&
          Number.isFinite(receiptMeta.partialAmount) && (
            <>
              {" "}
              — Paid this time: {formatReceiptMoney(receiptMeta.partialAmount)}
            </>
          )}
      </Typography>
      {receiptMeta.remainingAmount != null &&
        Number.isFinite(receiptMeta.remainingAmount) && (
          <Typography variant="caption" display="block" color="text.secondary">
            Remaining: {formatReceiptMoney(receiptMeta.remainingAmount)}
          </Typography>
        )}
      {receiptMeta.dueDateLabel ? (
        <Typography variant="caption" display="block" color="text.secondary">
          Due: {receiptMeta.dueDateLabel}
        </Typography>
      ) : null}
    </Box>
  );
}

/**
 * Full receipt body for the invoice preview dialog (screen only).
 */
export function InvoiceReceiptPreviewCard({
  settings,
  payment,
  invoiceCustomerLine,
  lines,
  totals,
  notes,
  paperSx,
  receiptMeta,
  paymentCollectionMode = "full",
}) {
  const noteText = String(notes || "").trim();
  return (
    <Paper
      className="print-paper print-receipt"
      variant="outlined"
      sx={{
        bgcolor: "#fff",
        borderColor: "#E5E7EB",
        p: 2,
        width: "148mm",
        maxWidth: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "visible",
        "@media screen": {
          minHeight: "200mm",
        },
        "@media print": {
          minHeight: "210mm",
        },
        ...paperSx,
      }}
    >
      <Box
        sx={{
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <InvoiceReceiptHeader
          settings={settings}
          payment={payment}
          invoiceCustomerLine={invoiceCustomerLine}
        />

        <InvoiceReceiptLineTable lines={lines} layout="preview" />
        <Divider sx={{ my: 1 }} />
        <TotalsRightAlign>
          <Stack spacing={0}>
            <InvoiceReceiptTotalsFooter totals={totals} />
            <InvoiceReceiptPaymentSummaryRows
              receiptMeta={receiptMeta}
              paymentStatus={payment?.status}
              paymentCollectionMode={paymentCollectionMode}
              totals={totals}
            />
          </Stack>
        </TotalsRightAlign>
        <Box sx={{ flex: "1 1 auto", minHeight: 16 }} />
      </Box>

      {noteText !== "" && (
        <Box
          sx={{
            flexShrink: 0,
            mt: "auto",
            pt: 2,
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            variant="caption"
            display="block"
            sx={{ whiteSpace: "pre-wrap", color: "text.secondary" }}
          >
            {notes}
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
