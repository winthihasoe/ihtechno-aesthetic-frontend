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
import {
  getClinicDisplayName,
  INVOICE_PRINT_LOGO_URL,
} from "../../utils/clinicBranding";
import {
  computeLineSubtotalBeforeDiscount,
  computeLineTotal,
  computeRowDiscountTaken,
  formatInvoiceOpeningHours,
  formatInvoicePrintDate,
  formatReceiptMoney,
  formatRowDiscountCaption,
  labelForPrintedInvoice,
} from "../../utils/invoiceReceiptUtils";

const voucherCaptionSx = {
  fontSize: "0.7rem",
  lineHeight: 1.4,
};

const voucherMetaLabelSx = {
  ...voucherCaptionSx,
  fontWeight: 600,
};

/**
 * Right-aligned payment lines under Grand Total (screen + print).
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

/** Voucher-style single Total row (no category breakdown). */
export function InvoiceReceiptTotalsFooter({ totals }) {
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
      <Box
        className="invoice-receipt-totals-grand"
        sx={{ display: "flex", justifyContent: "space-between", pt: 0.25 }}
      >
        <Typography fontWeight={700} component="span" variant="body2">
          Total
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

function InvoiceReceiptMetaField({ label, value }) {
  return (
    <Box
      sx={{ display: "flex", flexDirection: "row", gap: 0.5 }}
      className="invoice-receipt-meta-field"
    >
      <Typography
        component="span"
        variant="caption"
        sx={voucherMetaLabelSx}
        display="block"
      >
        {label}:
      </Typography>
      <Typography
        component="span"
        variant="caption"
        sx={voucherCaptionSx}
        display="block"
      >
        {value || "—"}
      </Typography>
    </Box>
  );
}

/**
 * Voucher header: B&W logo, clinic details from settings, invoice meta fields.
 */
export function InvoiceReceiptHeader({
  settings,
  payment,
  customerName = "",
  salesPersonName = "—",
}) {
  const phones = (settings?.clinic_phones || []).filter(Boolean);
  const email = (settings?.clinic_emails || []).find(Boolean) || "";
  const clinicName = getClinicDisplayName(settings);
  const clinicDescription = String(settings?.clinic_description || "").trim();
  const vrNo = payment?.invoice_number ? payment.invoice_number : "Draft";

  return (
    <Box className="invoice-receipt-header" textAlign="center">
      <Box
        className="invoice-receipt-logo-wrap"
        sx={{ mb: 0.75, display: "flex", justifyContent: "center" }}
      >
        <Box
          component="img"
          src={INVOICE_PRINT_LOGO_URL}
          alt={clinicName}
          className="invoice-receipt-logo"
          sx={{
            maxWidth: "42%",
            maxHeight: 40,
            objectFit: "contain",
          }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </Box>

      <Typography
        className="invoice-receipt-clinic-name"
        variant="subtitle2"
        fontWeight={700}
        display="block"
        sx={{ fontSize: "0.9rem", lineHeight: 1.3, mb: 0.25 }}
      >
        {clinicName}
      </Typography>
      {clinicDescription ? (
        <Typography
          className="invoice-receipt-clinic-description"
          variant="caption"
          display="block"
          sx={{ ...voucherCaptionSx, mb: 0.5, px: 1 }}
        >
          {clinicDescription}
        </Typography>
      ) : null}

      {!!settings?.clinic_address && (
        <Typography variant="caption" display="block" sx={voucherCaptionSx}>
          {settings.clinic_address}
        </Typography>
      )}
      {phones.length > 0 && (
        <Typography variant="caption" display="block" sx={voucherCaptionSx}>
          Ph : {phones.join(", ")}
        </Typography>
      )}
      <Typography variant="caption" display="block" sx={voucherCaptionSx}>
        {formatInvoiceOpeningHours(settings)}
      </Typography>
      {email ? (
        <Typography variant="caption" display="block" sx={voucherCaptionSx}>
          Email Address: {email}
        </Typography>
      ) : null}

      <Box
        className="invoice-receipt-meta-grid"
        sx={{
          mt: 1.25,
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr" },
          gap: 0.75,
          textAlign: "left",
        }}
      >
        <InvoiceReceiptMetaField
          label="Date"
          value={formatInvoicePrintDate(payment)}
        />
        <InvoiceReceiptMetaField label="Vr No" value={vrNo} />
        <InvoiceReceiptMetaField label="Customer" value={customerName} />
        <InvoiceReceiptMetaField label="Sale Person" value={salesPersonName} />
      </Box>
    </Box>
  );
}

/** Thank-you footer matching voucher sample. */
export function InvoiceReceiptThankYouFooter({ settings }) {
  const clinicName = getClinicDisplayName(settings);
  return (
    <Box
      className="invoice-receipt-thank-you"
      sx={{ mt: 2, textAlign: "center" }}
    >
      <Typography
        variant="caption"
        display="block"
        sx={{ ...voucherCaptionSx, fontWeight: 600 }}
      >
        *****Thank You for choosing {clinicName}
      </Typography>
      <Typography variant="caption" display="block" sx={voucherCaptionSx}>
        We Truly Appreciate Your Love and Trust*****
      </Typography>
    </Box>
  );
}

const LINE_COL_WIDTHS = {
  no: "8%",
  description: "42%",
  qty: "10%",
  price: "20%",
  amount: "20%",
};

/**
 * @param {'a5' | 'preview'} props.layout
 */
export function InvoiceReceiptLineTable({
  lines,
  layout,
  className,
  tableSize = "small",
}) {
  const compact = layout === "a5";
  const fontSize = compact ? "0.7rem" : undefined;
  const cellPy = compact ? 0.3 : 0.45;

  const body = lines.flatMap((line, index) => {
    const net = computeLineTotal(line);
    const unitPrice = Number(line?.unit_price || 0);
    const discTaken = computeRowDiscountTaken(line);
    const caption = formatRowDiscountCaption(line);
    const showDisc = discTaken > 0.005;
    const lineNo = index + 1;

    const rows = [
      <TableRow key={`${layout}-line-${index}`}>
        <TableCell
          sx={{
            px: 0.5,
            py: cellPy,
            width: LINE_COL_WIDTHS.no,
            verticalAlign: "top",
          }}
          align="center"
        >
          <Typography variant="caption" sx={{ fontSize }}>
            {lineNo}
          </Typography>
        </TableCell>
        <TableCell
          sx={{
            px: 0.5,
            py: cellPy,
            width: LINE_COL_WIDTHS.description,
            verticalAlign: "top",
          }}
        >
          <Typography variant="caption" sx={{ fontSize }}>
            {labelForPrintedInvoice(line)}
          </Typography>
        </TableCell>
        <TableCell
          sx={{
            px: 0.5,
            py: cellPy,
            width: LINE_COL_WIDTHS.qty,
            verticalAlign: "top",
          }}
          align="right"
        >
          <Typography variant="caption" sx={{ fontSize }}>
            {line.qty ?? 1}
          </Typography>
        </TableCell>
        <TableCell
          sx={{
            px: 0.5,
            py: cellPy,
            width: LINE_COL_WIDTHS.price,
            verticalAlign: "top",
          }}
          align="right"
        >
          <Typography variant="caption" sx={{ fontSize }}>
            {formatReceiptMoney(unitPrice)}
          </Typography>
        </TableCell>
        <TableCell
          sx={{
            px: 0.5,
            py: cellPy,
            width: LINE_COL_WIDTHS.amount,
            verticalAlign: "top",
          }}
          align="right"
        >
          <Typography variant="caption" sx={{ fontSize }} fontWeight={500}>
            {formatReceiptMoney(net)}
          </Typography>
        </TableCell>
      </TableRow>,
    ];

    if (showDisc) {
      const discLabel = caption ? `Discount ${caption}` : "Discount";
      rows.push(
        <TableRow key={`${layout}-line-${index}-disc`}>
          <TableCell sx={{ px: 0.5, py: compact ? 0.2 : 0.3 }} />
          <TableCell
            sx={{
              px: 0.5,
              py: compact ? 0.2 : 0.3,
              pl: layout === "preview" ? 1.5 : 1,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: compact ? "0.68rem" : undefined }}
            >
              {discLabel}
            </Typography>
          </TableCell>
          <TableCell sx={{ px: 0.5, py: compact ? 0.2 : 0.3 }} align="right" />
          <TableCell sx={{ px: 0.5, py: compact ? 0.2 : 0.3 }} align="right" />
          <TableCell sx={{ px: 0.5, py: compact ? 0.2 : 0.3 }} align="right">
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: compact ? "0.68rem" : undefined }}
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

  const headCellSx = {
    px: 0.5,
    py: 0.4,
    fontSize: compact ? "0.68rem" : undefined,
  };

  return (
    <Table
      size={tableSize}
      className={tableClass.trim()}
      sx={{
        tableLayout: "fixed",
        width: "100%",
        mt: layout === "a5" ? 1.5 : 2,
      }}
    >
      <TableHead>
        <TableRow>
          <TableCell
            sx={{ ...headCellSx, width: LINE_COL_WIDTHS.no }}
            align="center"
          >
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.secondary"
              sx={{ fontSize: headCellSx.fontSize }}
            >
              No
            </Typography>
          </TableCell>
          <TableCell sx={{ ...headCellSx, width: LINE_COL_WIDTHS.description }}>
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.secondary"
              sx={{ fontSize: headCellSx.fontSize }}
            >
              Description
            </Typography>
          </TableCell>
          <TableCell
            sx={{ ...headCellSx, width: LINE_COL_WIDTHS.qty }}
            align="right"
          >
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.secondary"
              sx={{ fontSize: headCellSx.fontSize }}
            >
              Qty
            </Typography>
          </TableCell>
          <TableCell
            sx={{ ...headCellSx, width: LINE_COL_WIDTHS.price }}
            align="right"
          >
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.secondary"
              sx={{ fontSize: headCellSx.fontSize }}
            >
              Price
            </Typography>
          </TableCell>
          <TableCell
            sx={{ ...headCellSx, width: LINE_COL_WIDTHS.amount }}
            align="right"
          >
            <Typography
              variant="caption"
              fontWeight={600}
              color="text.secondary"
              sx={{ fontSize: headCellSx.fontSize }}
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
  customerName = "",
  salesPersonName = "—",
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
        "@media screen": {
          minHeight: "200mm",
        },
        ...paperSx,
      }}
    >
      <Box
        className="print-receipt-body"
        sx={{
          flex: "1 1 auto",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <InvoiceReceiptHeader
          settings={settings}
          payment={payment}
          customerName={customerName}
          salesPersonName={salesPersonName}
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

        {noteText !== "" && (
          <Box sx={{ mt: 1.5 }}>
            <Typography
              variant="caption"
              display="block"
              sx={{ whiteSpace: "pre-wrap", color: "text.secondary" }}
            >
              {notes}
            </Typography>
          </Box>
        )}

        <Box sx={{ flex: "1 1 auto", minHeight: 8 }} />
        <InvoiceReceiptThankYouFooter settings={settings} />
      </Box>
    </Paper>
  );
}
