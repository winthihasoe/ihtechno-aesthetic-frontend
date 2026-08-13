import { useEffect, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import { cancelPatientPackage, getPackages, getTradeInPreview, tradeInPatientPackage } from "../../../../services/packageService";
import { formatKyats } from "../../../../utils/formatKyats";

export default function TradeInStepperDialog({ open, onClose, patientPackage, onDone }) {
  const [step, setStep] = useState(0);
  const [path, setPath] = useState("trade");
  const [catalog, setCatalog] = useState([]);
  const [targetPkg, setTargetPkg] = useState(null);
  const [preview, setPreview] = useState(null);
  const [reason, setReason] = useState("");
  const [refundAmount, setRefundAmount] = useState(0);
  const [storeCreditAmount, setStoreCreditAmount] = useState(0);
  const [refundMethod, setRefundMethod] = useState("cash");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setPath("trade");
    setTargetPkg(null);
    setPreview(null);
    setReason("");
    setRefundAmount(0);
    setStoreCreditAmount(0);
    setError("");
    getPackages({ active: 1 }).then((rows) => setCatalog(Array.isArray(rows) ? rows : [])).catch(() => setCatalog([]));
  }, [open]);

  useEffect(() => {
    if (!open || path !== "trade" || !targetPkg?.id || !patientPackage?.id) {
      setPreview(null);
      return;
    }
    getTradeInPreview(patientPackage.id, { to_package_id: targetPkg.id })
      .then(setPreview)
      .catch(() => setPreview(null));
  }, [open, path, targetPkg, patientPackage]);

  useEffect(() => {
    if (!preview) return;
    const residual = Number(preview.residual || 0);
    setRefundAmount(0);
    setStoreCreditAmount(residual);
  }, [preview]);

  const credit = path === "cancel" && preview ? Number(preview.credit_amount || 0) : Number(preview?.credit_amount || 0);

  const loadCancelPreview = async () => {
    try {
      const p = await getTradeInPreview(patientPackage.id, {});
      setPreview(p);
      setStoreCreditAmount(Number(p.credit_amount || 0));
    } catch {
      setPreview(null);
    }
  };

  const handleNext = async () => {
    if (step === 0 && path === "cancel") {
      await loadCancelPreview();
    }
    setStep((s) => s + 1);
  };

  const buildDisposition = () => {
    if (path === "trade" && preview) {
      const apply = Math.min(credit, Number(preview.new_package_price || 0));
      return {
        apply_to_new_invoice: apply,
        refund: refundAmount > 0 ? { amount: refundAmount, method: refundMethod } : { amount: 0 },
        store_credit: storeCreditAmount,
      };
    }
    return {
      refund: refundAmount > 0 ? { amount: refundAmount, method: refundMethod } : { amount: 0 },
      store_credit: storeCreditAmount,
    };
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    setError("");
    try {
      if (path === "trade") {
        await tradeInPatientPackage(patientPackage.id, {
          to_package_id: targetPkg.id,
          disposition: buildDisposition(),
          reason,
        });
      } else {
        await cancelPatientPackage(patientPackage.id, {
          disposition: buildDisposition(),
          reason,
        });
      }
      onDone();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not complete request.");
    } finally {
      setSubmitting(false);
    }
  };

  const steps = ["Choose path", path === "trade" ? "Pick package" : "Credit preview", "Disposition", "Review"];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Trade-in or cancel</DialogTitle>
      <DialogContent>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {step === 0 && (
          <Stack spacing={1}>
            <Button variant={path === "trade" ? "contained" : "outlined"} onClick={() => setPath("trade")}>
              Trade for another package
            </Button>
            <Button variant={path === "cancel" ? "contained" : "outlined"} onClick={() => setPath("cancel")}>
              Cancel without new package
            </Button>
          </Stack>
        )}

        {step === 1 && path === "trade" && (
          <Autocomplete
            options={catalog}
            getOptionLabel={(o) => `${o.name} · ${formatKyats(o.price)}`}
            value={targetPkg}
            onChange={(_, v) => setTargetPkg(v)}
            renderInput={(params) => <TextField {...params} label="New catalog package" />}
          />
        )}

        {step === 1 && path === "cancel" && preview && (
          <Typography>Estimated credit: {formatKyats(preview.credit_amount)}</Typography>
        )}

        {step === 1 && path === "trade" && preview && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2">Credit: {formatKyats(preview.credit_amount)}</Typography>
            <Typography variant="body2">New price: {formatKyats(preview.new_package_price)}</Typography>
            <Typography variant="body2">Top-up due: {formatKyats(preview.top_up)}</Typography>
            <Typography variant="body2">Residual: {formatKyats(preview.residual)}</Typography>
          </Box>
        )}

        {step === 2 && (
          <Stack spacing={2}>
            {Number(preview?.residual || preview?.credit_amount || 0) > 0 && (
              <>
                <TextField
                  type="number"
                  label="Refund amount"
                  value={refundAmount}
                  onChange={(e) => {
                    const v = Number(e.target.value || 0);
                    setRefundAmount(v);
                    const max = Number(preview?.residual ?? preview?.credit_amount ?? 0);
                    setStoreCreditAmount(Math.max(0, max - v));
                  }}
                  inputProps={{ min: 0 }}
                />
                <FormControl size="small">
                  <InputLabel>Refund method</InputLabel>
                  <Select label="Refund method" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
                    <MenuItem value="cash">Cash</MenuItem>
                    <MenuItem value="bank_transfer">Bank transfer</MenuItem>
                    <MenuItem value="card_reversal">Card reversal</MenuItem>
                    <MenuItem value="store_credit">Store credit</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  type="number"
                  label="Store credit amount"
                  value={storeCreditAmount}
                  onChange={(e) => setStoreCreditAmount(Number(e.target.value || 0))}
                  inputProps={{ min: 0 }}
                />
              </>
            )}
            <TextField required label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} />
          </Stack>
        )}

        {step === 3 && (
          <Stack spacing={1}>
            <Typography variant="body2">Path: {path === "trade" ? "Trade-in" : "Cancel"}</Typography>
            {preview && <Typography variant="body2">Credit: {formatKyats(credit)}</Typography>}
            {path === "trade" && preview && (
              <Typography variant="body2">Top-up due: {formatKyats(preview.top_up)}</Typography>
            )}
            <Typography variant="body2">Refund: {formatKyats(refundAmount)}</Typography>
            <Typography variant="body2">Store credit: {formatKyats(storeCreditAmount)}</Typography>
            <Typography variant="body2">Reason: {reason}</Typography>
            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {step > 0 && (
          <Button onClick={() => setStep((s) => s - 1)} disabled={submitting}>
            Back
          </Button>
        )}
        {step < 3 ? (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={step === 1 && path === "trade" && !targetPkg}
          >
            Next
          </Button>
        ) : (
          <Button variant="contained" onClick={handleConfirm} disabled={submitting || !reason.trim()}>
            Confirm
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
