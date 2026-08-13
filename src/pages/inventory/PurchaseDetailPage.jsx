import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { formatKyats } from "../../utils/formatKyats";
import { getPurchase } from "./inventoryService";

function statusColor(status) {
  return status === "received" ? "success" : "default";
}

function receiptTypeLabel(rt) {
  if (rt === "consignment") return "Consignment";
  return "Purchased";
}

export default function PurchaseDetailPage() {
  const { purchaseId, id } = useParams();
  const idParam = purchaseId ?? id;
  const navigate = useNavigate();
  const theme = useTheme();
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
      ["Receipt type", receiptTypeLabel(purchase.receipt_type)],
      ["Total amount", formatKyats(Number(purchase.total_amount ?? lineTotal))],
      ["Items", `${purchase.items?.length || 0} item(s)`],
      ["Created by", purchase.creator?.name ?? "—"],
    ];
    if (purchase.payable_due_date) {
      rows.splice(1, 0, [
        "Payable due date",
        dayjs(purchase.payable_due_date).format("DD MMM YYYY"),
      ]);
    }
    return rows;
  }, [purchase, lineTotal]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
        <CircularProgress />
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

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 2,
          mb: 2,
        }}
      >
        {summaryCards.map(([label, value]) => (
          <Paper
            key={label}
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 3,
              background: alpha(
                theme.palette.primary.main,
                theme.palette.mode === "dark" ? 0.1 : 0.05,
              ),
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={700}
            >
              {label}
            </Typography>
            <Typography variant="h6" fontWeight={800}>
              {value}
            </Typography>
          </Paper>
        ))}
      </Box>

      {purchase.notes ? (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={800} gutterBottom>
            Notes
          </Typography>
          <Typography color="text.secondary">{purchase.notes}</Typography>
        </Paper>
      ) : null}

      <Paper variant="outlined" sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Typography fontWeight={800}>Receipt lines</Typography>
          <Typography variant="body2" color="text.secondary">
            Products received into inventory from this receipt.
          </Typography>
        </Box>
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>Batch</TableCell>
                <TableCell>Expiry</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Cost/unit</TableCell>
                <TableCell align="right">Line total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(purchase.items || []).map((item) => {
                const total =
                  Number(item.quantity || 0) * Number(item.cost_price || 0);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Typography fontWeight={700}>
                        {item.product?.name ?? "Unknown product"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.product?.unit ?? "—"}
                      </Typography>
                    </TableCell>
                    <TableCell>{item.batch_number ?? "—"}</TableCell>
                    <TableCell>
                      {item.expiry_date
                        ? dayjs(item.expiry_date).format("DD MMM YYYY")
                        : "—"}
                    </TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">
                      {formatKyats(Number(item.cost_price || 0))}
                    </TableCell>
                    <TableCell align="right">
                      <Typography fontWeight={800}>
                        {formatKyats(total)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
