import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import { alpha, useTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { formatKyats } from "../../utils/formatKyats";
import { getPurchase } from "./inventoryService";

function paymentTypeLabel(pt) {
  if (pt === "consignment") return "Consignment";
  if (pt === "cash_down") return "Cash down";
  if (pt === "credit") return "Credit";
  return "Credit";
}

function statusColor(status) {
  return status === "received" ? "success" : "default";
}

/** Theme-aware "paper" palette so the receipt reads like a printed document
 * in light mode and a dark surface in dark mode. */
function getPaperPalette(theme) {
  const dark = theme.palette.mode === "dark";
  return {
    bg: dark ? "#000000" : "#ffffff",
    ink: theme.palette.text.primary,
    inkSoft: theme.palette.text.secondary,
    inkFaint: theme.palette.text.disabled,
    rule: theme.palette.divider,
    ruleStrong: dark
      ? alpha(theme.palette.common.white, 0.22)
      : alpha(theme.palette.common.black, 0.18),
    zebra: dark
      ? alpha(theme.palette.common.white, 0.04)
      : alpha(theme.palette.common.black, 0.025),
  };
}

const LINE_COLS = "28px minmax(150px, 1fr) 96px 104px 64px 104px 116px";
const LINE_COLS_MOBILE =
  "18px minmax(100px, 1fr) 56px 72px 40px 72px 76px";

const LINE_HEADERS = [
  "#",
  "Item",
  "Batch",
  "Expiry",
  "Qty",
  "Cost/unit",
  "Amount",
];

function ReceiptField({ label, value, paper }) {
  if (value == null || value === "") return null;
  return (
    <Box>
      <Typography
        sx={{
          fontSize: 11,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          fontWeight: 700,
          color: paper.inkFaint,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 600, color: paper.ink }}>
        {value}
      </Typography>
    </Box>
  );
}

function PurchaseLineRow({ item, idx, paper }) {
  const total = Number(item.quantity || 0) * Number(item.cost_price || 0);
  const subtitle = [item.product?.generic_name, item.product?.unit]
    .filter(Boolean)
    .join(" · ");

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: LINE_COLS_MOBILE, sm: LINE_COLS },
        columnGap: { xs: 1, sm: 1.5 },
        alignItems: "center",
        py: { xs: 1, sm: 1.25 },
        borderBottom: `1px dashed ${paper.rule}`,
      }}
    >
      <Typography
        sx={{
          fontSize: { xs: 12, sm: 13 },
          color: paper.inkFaint,
        }}
      >
        {idx + 1}
      </Typography>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: { xs: 13, sm: 14 },
            fontWeight: 700,
            color: paper.ink,
            lineHeight: 1.25,
          }}
        >
          {item.product?.name ?? "Unknown product"}
        </Typography>
        {subtitle ? (
          <Typography
            sx={{
              fontSize: { xs: 11, sm: 12 },
              color: paper.inkFaint,
              lineHeight: 1.2,
            }}
          >
            {subtitle}
          </Typography>
        ) : null}
      </Box>
      <Typography
        sx={{
          fontSize: { xs: 12, sm: 13 },
          color: paper.inkSoft,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {item.batch_number ?? "—"}
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: 12, sm: 13 },
          color: paper.inkSoft,
          whiteSpace: "nowrap",
        }}
      >
        {item.expiry_date
          ? dayjs(item.expiry_date).format("DD MMM YY")
          : "—"}
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: 13, sm: 14 },
          fontWeight: 600,
          color: paper.ink,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {item.quantity}
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: 12, sm: 14 },
          color: paper.inkSoft,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {formatKyats(Number(item.cost_price || 0))}
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: 13, sm: 14 },
          fontWeight: 700,
          color: paper.ink,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {formatKyats(total)}
      </Typography>
    </Box>
  );
}

export default function PurchaseDetailPage() {
  const { purchaseId, id } = useParams();
  const idParam = purchaseId ?? id;
  const navigate = useNavigate();
  const theme = useTheme();
  const PAPER = getPaperPalette(theme);
  const [purchase, setPurchase] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setPurchase(await getPurchase(idParam));
    } catch {
      setError("Could not load purchase details.");
    } finally {
      setLoading(false);
    }
  }, [idParam]);

  useEffect(() => {
    load();
  }, [load]);

  const lineTotal = useMemo(
    () =>
      (purchase?.items || []).reduce(
        (sum, item) =>
          sum + Number(item.quantity || 0) * Number(item.cost_price || 0),
        0,
      ),
    [purchase],
  );

  const summaryCards = useMemo(() => {
    if (!purchase) return [];
    const rows = [
      {
        label: "Payment type",
        shortLabel: "Payment",
        value: paymentTypeLabel(purchase.payment_type),
      },
      {
        label: "Total amount",
        shortLabel: "Total",
        value: formatKyats(Number(purchase.total_amount ?? lineTotal)),
      },
      {
        label: "Items",
        shortLabel: "Items",
        value: `${purchase.items?.length || 0} item(s)`,
      },
      {
        label: "Created by",
        shortLabel: "Creator",
        value: purchase.creator?.name ?? "—",
      },
    ];
    if (purchase.journal_posting_status) {
      rows.push({
        label: "Accounting",
        shortLabel: "Accounting",
        value: purchase.journal_posting_status,
      });
    }
    if (purchase.supplier_invoice_ref) {
      rows.push({
        label: "Supplier invoice",
        shortLabel: "Invoice",
        value: purchase.supplier_invoice_ref,
      });
    }
    if (purchase.external_po_number) {
      rows.push({
        label: "External PO",
        shortLabel: "Ext PO",
        value: purchase.external_po_number,
      });
    }
    if (purchase.cash_account) {
      rows.push({
        label: "Cash account",
        shortLabel: "Cash acct",
        value: `${purchase.cash_account.code} — ${purchase.cash_account.name}`,
      });
    }
    if (purchase.payable_due_date) {
      rows.splice(1, 0, {
        label: "Payable due date",
        shortLabel: "Due date",
        value: dayjs(purchase.payable_due_date).format("DD MMM YYYY"),
      });
    }
    return rows;
  }, [purchase, lineTotal]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
        <LoadingIndicator size={112} />
      </Box>
    );
  }

  if (error || !purchase) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          Back
        </Button>
        <Typography color="error" sx={{ mt: 2 }}>
          {error || "Purchase not found."}
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Back
      </Button>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1.5}
        mb={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary">
            Receipt #{purchase.id}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {purchase.supplier?.name ?? "No supplier"} •{" "}
            {dayjs(purchase.date).format("DD MMM YYYY")}
          </Typography>
        </Box>
        <Chip
          label={purchase.status === "received" ? "Received" : "Draft"}
          color={statusColor(purchase.status)}
          sx={{ fontWeight: 800 }}
        />
      </Stack>

      <Stack
        direction="row"
        flexWrap="wrap"
        spacing={{ xs: 0.75, sm: 1, md: 2 }}
        mb={{ xs: 1.5, md: 3 }}
        useFlexGap
        sx={{ rowGap: { xs: 0.75, sm: 1, md: 2 } }}
      >
        {summaryCards.map(({ label, shortLabel, value, emphasize }) => (
          <Paper
            key={label}
            elevation={0}
            sx={{
              flex: {
                xs: "1 1 calc(33.333% - 6px)",
                sm: "1 1 calc(33.333% - 8px)",
                md: "1 1 calc(16.666% - 16px)",
              },
              minWidth: { xs: 0, md: 140 },
              p: { xs: 0.75, sm: 1, md: 2.5 },
              borderRadius: { xs: 1, md: 2 },
              border: 1,
              borderColor: "divider",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              textTransform="uppercase"
              letterSpacing={0.2}
              noWrap
              sx={{
                display: "block",
                fontSize: { xs: "0.58rem", sm: "0.62rem", md: "0.75rem" },
                lineHeight: 1.15,
              }}
            >
              <Box
                component="span"
                sx={{ display: { xs: "none", md: "inline" } }}
              >
                {label}
              </Box>
              <Box
                component="span"
                sx={{ display: { xs: "inline", md: "none" } }}
              >
                {shortLabel}
              </Box>
            </Typography>
            <Typography
              fontWeight={700}
              mt={{ xs: 0.125, md: 0.5 }}
              color={emphasize ? "warning.main" : "text.primary"}
              sx={{
                fontSize: { xs: "0.78rem", sm: "0.85rem", md: "1.25rem" },
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: { xs: "nowrap", md: "normal" },
              }}
            >
              {value}
            </Typography>
          </Paper>
        ))}
      </Stack>

      <Paper
        elevation={0}
        sx={{
          maxWidth: 860,
          mx: "auto",
          bgcolor: PAPER.bg,
          color: PAPER.ink,
          borderRadius: 0,
          border: `1px solid ${PAPER.ruleStrong}`,
          boxShadow:
            "0 1px 2px rgba(15,23,42,0.08), 0 12px 32px rgba(15,23,42,0.08)",
          overflow: "hidden",
        }}
      >
        {/* <Box sx={{ height: 6, bgcolor: "primary.main" }} /> */}
        <Box sx={{ p: { xs: 2.5, sm: 5 } }}>
          {/* Document header */}
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "flex-start" }}
            spacing={2}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: { xs: 18, sm: 22 },
                  fontWeight: 800,
                  letterSpacing: 1.5,
                  color: PAPER.ink,
                  lineHeight: 1.2,
                }}
              >
                GOODS RECEIVED NOTE
              </Typography>
              <Typography sx={{ fontSize: 13, color: PAPER.inkSoft, mt: 0.25 }}>
                DermaFairy Clinic · Inventory Receiving
              </Typography>
            </Box>
            <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
              <Typography
                sx={{
                  fontSize: 11,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: PAPER.inkFaint,
                }}
              >
                Receipt No.
              </Typography>
              <Typography
                sx={{ fontSize: 24, fontWeight: 800, color: PAPER.ink }}
              >
                #{purchase.id}
              </Typography>
              <Chip
                size="small"
                label={purchase.status === "received" ? "Received" : "Draft"}
                color={statusColor(purchase.status)}
                sx={{ fontWeight: 700, mt: 0.5 }}
              />
            </Box>
          </Stack>

          <Box
            sx={{
              height: 1,
              bgcolor: PAPER.ruleStrong,
              my: { xs: 2, sm: 2.5 },
            }}
          />

          {/* Supplier + receipt meta */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              columnGap: 4,
              rowGap: 2,
            }}
          >
            <Stack spacing={1.25}>
              <Typography
                sx={{
                  fontSize: 11,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: PAPER.inkFaint,
                }}
              >
                Supplier
              </Typography>
              <Typography
                sx={{ fontSize: 16, fontWeight: 700, color: PAPER.ink }}
              >
                {purchase.supplier?.name ?? "No supplier"}
              </Typography>
              {purchase.supplier?.phone ? (
                <Typography sx={{ fontSize: 13, color: PAPER.inkSoft }}>
                  {purchase.supplier.phone}
                </Typography>
              ) : null}
              {purchase.supplier?.address ? (
                <Typography sx={{ fontSize: 13, color: PAPER.inkSoft }}>
                  {purchase.supplier.address}
                </Typography>
              ) : null}
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 1.75,
                justifyItems: { xs: "start", sm: "end" },
                textAlign: { xs: "left", sm: "right" },
              }}
            >
              <ReceiptField
                label="Receipt date"
                value={dayjs(purchase.date).format("DD MMM YYYY")}
                paper={PAPER}
              />
              <ReceiptField
                label="Payment type"
                value={paymentTypeLabel(purchase.payment_type)}
                paper={PAPER}
              />
              {purchase.payable_due_date ? (
                <ReceiptField
                  label="Payable due"
                  value={dayjs(purchase.payable_due_date).format("DD MMM YYYY")}
                  paper={PAPER}
                />
              ) : null}
              <ReceiptField
                label="Supplier invoice"
                value={purchase.supplier_invoice_ref}
                paper={PAPER}
              />
              <ReceiptField
                label="External PO"
                value={purchase.external_po_number}
                paper={PAPER}
              />
              {purchase.cash_account ? (
                <ReceiptField
                  label="Cash account"
                  value={`${purchase.cash_account.code} — ${purchase.cash_account.name}`}
                  paper={PAPER}
                />
              ) : null}
            </Box>
          </Box>

          <Box sx={{ mt: 3, mb: 1 }}>
            <Typography
              sx={{
                fontSize: 11,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                fontWeight: 700,
                color: PAPER.inkFaint,
              }}
            >
              Items received
            </Typography>
          </Box>

          {/* Line items ledger */}
          <Box
            sx={{
              overflowX: "auto",
              mx: { xs: -2.5, sm: 0 },
              px: { xs: 2.5, sm: 0 },
              WebkitOverflowScrolling: "touch",
            }}
          >
            <Box sx={{ minWidth: { xs: 480, sm: 620 } }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: LINE_COLS_MOBILE, sm: LINE_COLS },
                  columnGap: { xs: 1, sm: 1.5 },
                  alignItems: "end",
                  py: 1,
                  borderBottom: `2px solid ${PAPER.ruleStrong}`,
                }}
              >
                {LINE_HEADERS.map((h, i) => (
                  <Typography
                    key={h}
                    sx={{
                      fontSize: { xs: 10, sm: 11 },
                      letterSpacing: 0.5,
                      textTransform: "uppercase",
                      fontWeight: 700,
                      color: PAPER.inkSoft,
                      textAlign: i >= 4 ? "right" : "left",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </Typography>
                ))}
              </Box>

              {(purchase.items || []).length === 0 ? (
                <Typography sx={{ py: 2, fontSize: 14, color: PAPER.inkSoft }}>
                  No items recorded on this receipt.
                </Typography>
              ) : (
                (purchase.items || []).map((item, idx) => (
                  <PurchaseLineRow
                    key={item.id}
                    item={item}
                    idx={idx}
                    paper={PAPER}
                  />
                ))
              )}
            </Box>
          </Box>

          {/* Totals */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              mt: 2,
            }}
          >
            <Box sx={{ width: { xs: "100%", sm: 320 } }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                sx={{ py: 0.5 }}
              >
                <Typography sx={{ fontSize: 13, color: PAPER.inkSoft }}>
                  Items
                </Typography>
                <Typography
                  sx={{
                    fontSize: 13,
                    color: PAPER.inkSoft,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {purchase.items?.length || 0}
                </Typography>
              </Stack>
              <Stack
                direction="row"
                justifyContent="space-between"
                sx={{ py: 0.5 }}
              >
                <Typography sx={{ fontSize: 13, color: PAPER.inkSoft }}>
                  Subtotal
                </Typography>
                <Typography
                  sx={{
                    fontSize: 13,
                    color: PAPER.ink,
                    fontWeight: 600,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatKyats(lineTotal)}
                </Typography>
              </Stack>
              <Box
                sx={{
                  height: 2,
                  bgcolor: PAPER.ruleStrong,
                  my: 0.75,
                }}
              />
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="baseline"
              >
                <Typography
                  sx={{
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                    textTransform: "uppercase",
                    color: PAPER.ink,
                  }}
                >
                  Total
                </Typography>
                <Typography
                  sx={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: PAPER.ink,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatKyats(Number(purchase.total_amount ?? lineTotal))}
                </Typography>
              </Stack>
            </Box>
          </Box>

          {purchase.notes ? (
            <Box
              sx={{
                mt: 3,
                p: 1.75,
                borderRadius: 1.5,
                bgcolor: PAPER.zebra,
                border: `1px solid ${PAPER.rule}`,
              }}
            >
              <Typography
                sx={{
                  fontSize: 11,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                  fontWeight: 700,
                  color: PAPER.inkFaint,
                  mb: 0.5,
                }}
              >
                Notes
              </Typography>
              <Typography sx={{ fontSize: 14, color: PAPER.inkSoft }}>
                {purchase.notes}
              </Typography>
            </Box>
          ) : null}
        </Box>
      </Paper>
    </Box>
  );
}
