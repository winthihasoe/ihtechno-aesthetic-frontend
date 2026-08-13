import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import DownloadIcon from "@mui/icons-material/Download";
import {
  downloadPrescriptionPdf,
  getPrescriptionPrintData,
} from "../../services/prescriptionService";

function formatDateTime(value) {
  if (!value) return "—";
  const dt = dayjs(value);
  return dt.isValid() ? dt.format("DD-MM-YYYY HH:mm") : "—";
}

function PrescriptionPrintPreview({ data }) {
  const prescription = data?.prescription ?? {};
  const clinic = data?.clinic ?? {};
  const items = prescription.items ?? [];

  return (
    <Box id="prescription-print-root" sx={{ color: "text.primary" }}>
      <Typography variant="h6" fontWeight={700}>
        {clinic.name || "Derma Fairy"}
      </Typography>
      {clinic.address ? (
        <Typography variant="body2" color="text.secondary">
          {clinic.address}
        </Typography>
      ) : null}
      {clinic.phone ? (
        <Typography variant="body2" color="text.secondary">
          Tel: {clinic.phone}
        </Typography>
      ) : null}

      <Stack spacing={0.5} sx={{ mt: 2 }}>
        <Typography variant="subtitle2">Prescription</Typography>
        <Typography variant="caption" color="text.secondary">
          Printed: {formatDateTime(data?.print_at)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Prescribed: {formatDateTime(prescription.prescribed_at)}
        </Typography>
      </Stack>

      <Stack spacing={0.5} sx={{ mt: 2 }}>
        <Typography variant="subtitle2">Patient</Typography>
        <Typography variant="body2">
          {prescription.patient?.name ?? "Walk-in"}
        </Typography>
        {prescription.patient?.phone ? (
          <Typography variant="caption" color="text.secondary">
            {prescription.patient.phone}
          </Typography>
        ) : null}
      </Stack>

      <Stack spacing={0.5} sx={{ mt: 2 }}>
        <Typography variant="subtitle2">Prescribed by</Typography>
        <Typography variant="body2">
          {prescription.prescribed_by?.name ?? prescription.prescribedBy?.name ?? "—"}
        </Typography>
      </Stack>

      <Table size="small" sx={{ mt: 2 }}>
        <TableHead>
          <TableRow>
            <TableCell>#</TableCell>
            <TableCell>Medicine</TableCell>
            <TableCell>Directions</TableCell>
            <TableCell>Qty</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={item.id ?? index}>
              <TableCell>{index + 1}</TableCell>
              <TableCell>
                <Typography variant="body2">{item.medicine_name}</Typography>
                {item.strength ? (
                  <Typography variant="caption" color="text.secondary">
                    {[item.strength, item.dosage_form].filter(Boolean).join(" ")}
                  </Typography>
                ) : null}
              </TableCell>
              <TableCell>
                {[item.frequency, item.duration, item.route ? `Route: ${item.route}` : null, item.special_instructions]
                  .filter(Boolean)
                  .join(" · ")}
              </TableCell>
              <TableCell>
                {[item.quantity, item.unit].filter((v) => v !== null && v !== "").join(" ")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {prescription.notes ? (
        <Box sx={{ mt: 2, p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
          <Typography variant="subtitle2">Notes</Typography>
          <Typography variant="body2">{prescription.notes}</Typography>
        </Box>
      ) : null}
    </Box>
  );
}

/**
 * Printable prescription preview with browser print and PDF download.
 */
export default function PrescriptionPrintDialog({
  open,
  prescriptionId,
  onClose,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const printStyleRef = useRef(null);

  useEffect(() => {
    if (!open || !prescriptionId) {
      setData(null);
      setError("");
      return;
    }

    let active = true;
    setLoading(true);
    setError("");
    getPrescriptionPrintData(prescriptionId)
      .then((res) => {
        if (active) setData(res);
      })
      .catch(() => {
        if (active) setError("Could not load prescription print data.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, prescriptionId]);

  useEffect(() => {
    if (!printStyleRef.current) {
      const style = document.createElement("style");
      style.setAttribute("data-prescription-print", "true");
      style.textContent = `
        @media print {
          body * { visibility: hidden; }
          #prescription-print-root, #prescription-print-root * { visibility: visible; }
          #prescription-print-root { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `;
      document.head.appendChild(style);
      printStyleRef.current = style;
    }

    return () => {
      printStyleRef.current?.remove();
      printStyleRef.current = null;
    };
  }, []);

  const handleDownloadPdf = async () => {
    if (!prescriptionId) return;
    setDownloading(true);
    setError("");
    try {
      await downloadPrescriptionPdf(prescriptionId);
    } catch {
      setError("Could not download PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Print Prescription</DialogTitle>
      <DialogContent>
        {loading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress size={28} />
          </Stack>
        ) : null}
        {error ? <Alert severity="error">{error}</Alert> : null}
        {!loading && data ? <PrescriptionPrintPreview data={data} /> : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          startIcon={<DownloadIcon />}
          onClick={handleDownloadPdf}
          disabled={!prescriptionId || downloading || loading}
        >
          Download PDF
        </Button>
        <Button
          variant="contained"
          startIcon={<PrintIcon />}
          onClick={() => window.print()}
          disabled={!data || loading}
        >
          Print
        </Button>
      </DialogActions>
    </Dialog>
  );
}
