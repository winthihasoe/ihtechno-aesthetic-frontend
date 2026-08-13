import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import dayjs from "dayjs";
import LoadingIndicator from "../../../components/common/LoadingIndicator";
import PatientAutocomplete from "../../patients/components/PatientAutocomplete";
import {
  getPackage,
  getPackages,
  importLegacyPackageManual,
} from "../../../services/packageService";
import { resolveApiError } from "../../../services/apiClient";
import useToastStore from "../../../stores/toastStore";

const emptyUsageRow = () => ({
  treatment_template_id: "",
  used_at: dayjs().format("YYYY-MM-DD"),
  used_sessions: "",
});

function buildItemsFromPackage(pkg) {
  return (pkg?.items ?? []).map((line) => ({
    treatment_template_id: line.treatment_template_id,
    treatment_template_name: line.treatment_template?.name ?? "Treatment",
    total_sessions: Number(line.total_sessions ?? 0),
    remaining_sessions: Number(line.total_sessions ?? 0),
  }));
}

function computeExpiryDate(purchasedAt, validityDays) {
  if (!purchasedAt) return "";
  return dayjs(purchasedAt)
    .add(Math.max(0, Number(validityDays) || 0), "day")
    .format("YYYY-MM-DD");
}

export default function PackageManualImportDialog({
  open,
  onClose,
  onImported,
}) {
  const { pushToast } = useToastStore();
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingPackage, setLoadingPackage] = useState(false);
  const [saving, setSaving] = useState(false);

  const [patient, setPatient] = useState(null);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [packageDetail, setPackageDetail] = useState(null);
  const [purchasedAt, setPurchasedAt] = useState(dayjs().format("YYYY-MM-DD"));
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryTouched, setExpiryTouched] = useState(false);
  const [totalPrice, setTotalPrice] = useState("");
  const [packageRef, setPackageRef] = useState("");
  const [items, setItems] = useState([]);
  const [usages, setUsages] = useState([]);

  const resetForm = () => {
    setPatient(null);
    setSelectedPackage(null);
    setPackageDetail(null);
    setPurchasedAt(dayjs().format("YYYY-MM-DD"));
    setExpiryDate("");
    setExpiryTouched(false);
    setTotalPrice("");
    setPackageRef("");
    setItems([]);
    setUsages([]);
  };

  useEffect(() => {
    if (!open) return;
    setLoadingCatalog(true);
    getPackages({ active_only: true })
      .then((rows) => setCatalog(Array.isArray(rows) ? rows : []))
      .catch(() => setCatalog([]))
      .finally(() => setLoadingCatalog(false));
  }, [open]);

  useEffect(() => {
    if (!selectedPackage?.id) {
      setPackageDetail(null);
      setItems([]);
      return;
    }

    setLoadingPackage(true);
    getPackage(selectedPackage.id)
      .then((pkg) => {
        setPackageDetail(pkg);
        setItems(buildItemsFromPackage(pkg));
        setTotalPrice(String(pkg?.price ?? ""));
        if (!expiryTouched) {
          setExpiryDate(computeExpiryDate(purchasedAt, pkg?.validity_days));
        }
      })
      .catch(() => {
        setPackageDetail(null);
        setItems([]);
      })
      .finally(() => setLoadingPackage(false));
  }, [selectedPackage?.id]);

  useEffect(() => {
    if (expiryTouched || !packageDetail) return;
    setExpiryDate(computeExpiryDate(purchasedAt, packageDetail.validity_days));
  }, [purchasedAt, packageDetail, expiryTouched]);

  const templateOptions = useMemo(
    () =>
      items.map((item) => ({
        id: item.treatment_template_id,
        name: item.treatment_template_name,
      })),
    [items],
  );

  const canSubmit = useMemo(() => {
    if (!patient?.id || !selectedPackage?.id || !purchasedAt) return false;
    if (!items.length) return false;
    if (
      items.some(
        (item) =>
          item.remaining_sessions === "" || item.remaining_sessions == null,
      )
    ) {
      return false;
    }
    if (expiryDate && dayjs(expiryDate).isBefore(dayjs(), "day")) return false;
    return true;
  }, [patient, selectedPackage, purchasedAt, expiryDate, items]);

  const handleClose = () => {
    if (saving) return;
    resetForm();
    onClose();
  };

  const updateItemRemaining = (templateId, value) => {
    setItems((prev) =>
      prev.map((item) =>
        item.treatment_template_id === templateId
          ? { ...item, remaining_sessions: value }
          : item,
      ),
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload = {
        patient_id: patient.id,
        package_id: selectedPackage.id,
        purchased_at: purchasedAt,
        expiry_date: expiryDate || undefined,
        total_price: totalPrice !== "" ? Number(totalPrice) : undefined,
        package_ref: packageRef.trim() || undefined,
        items: items.map((item) => ({
          treatment_template_id: item.treatment_template_id,
          remaining_sessions: Number(item.remaining_sessions),
        })),
        usages: usages
          .filter(
            (row) =>
              row.treatment_template_id &&
              row.used_at &&
              Number(row.used_sessions) > 0,
          )
          .map((row) => ({
            treatment_template_id: Number(row.treatment_template_id),
            used_at: row.used_at,
            used_sessions: Number(row.used_sessions),
          })),
      };

      const result = await importLegacyPackageManual(payload);
      pushToast({
        message: result.skipped
          ? "Package was already imported (same reference or idempotency key)."
          : "Legacy package imported for patient.",
        severity: result.skipped ? "info" : "success",
      });
      onImported?.();
      handleClose();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to import package."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>Import legacy package for patient</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Alert severity="info" variant="outlined">
            Register a package the patient already bought before go-live, with
            the correct remaining sessions and optional usage history. No
            commission or deposit journals are posted.
          </Alert>

          <PatientAutocomplete
            label="Patient"
            value={patient}
            onChange={setPatient}
          />

          <Autocomplete
            options={catalog}
            value={selectedPackage}
            onChange={(_, next) => setSelectedPackage(next)}
            loading={loadingCatalog}
            getOptionLabel={(opt) => opt?.name ?? ""}
            isOptionEqualToValue={(a, b) => Number(a?.id) === Number(b?.id)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Catalog package"
                size="small"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {loadingCatalog ? <LoadingIndicator size={18} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Purchased date"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={purchasedAt}
              onChange={(e) => setPurchasedAt(e.target.value)}
            />
            <TextField
              label="Expiry date"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={expiryDate}
              onChange={(e) => {
                setExpiryTouched(true);
                setExpiryDate(e.target.value);
              }}
              helperText={
                packageDetail && !expiryTouched
                  ? `Default: purchased + ${packageDetail.validity_days ?? 0} days`
                  : undefined
              }
            />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Total price paid"
              type="number"
              size="small"
              fullWidth
              inputProps={{ min: 0, step: "any" }}
              value={totalPrice}
              onChange={(e) => setTotalPrice(e.target.value)}
            />
            <TextField
              label="Import reference (optional)"
              size="small"
              fullWidth
              value={packageRef}
              onChange={(e) => setPackageRef(e.target.value)}
              helperText="For idempotency — reuse the same ref to avoid duplicates"
            />
          </Stack>

          {loadingPackage ? (
            <Box display="flex" justifyContent="center" py={2}>
              <LoadingIndicator size={32} />
            </Box>
          ) : items.length > 0 ? (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Remaining sessions per treatment line
              </Typography>
              <Stack spacing={1.5}>
                {items.map((item) => (
                  <Stack
                    key={item.treatment_template_id}
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems={{ sm: "center" }}
                  >
                    <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }}>
                      {item.treatment_template_name} · total{" "}
                      {item.total_sessions}
                    </Typography>
                    <TextField
                      label="Remaining"
                      type="number"
                      size="small"
                      inputProps={{ min: 0, max: item.total_sessions, step: 1 }}
                      value={item.remaining_sessions}
                      onChange={(e) =>
                        updateItemRemaining(
                          item.treatment_template_id,
                          e.target.value,
                        )
                      }
                      sx={{ width: { xs: "100%", sm: 160 } }}
                    />
                  </Stack>
                ))}
              </Stack>
            </Box>
          ) : selectedPackage ? (
            <Typography variant="body2" color="text.secondary">
              This catalog package has no treatment lines.
            </Typography>
          ) : null}

          {items.length > 0 ? (
            <Box>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1 }}
              >
                <Typography variant="subtitle2">
                  Historical usages (optional)
                </Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() =>
                    setUsages((prev) => [...prev, emptyUsageRow()])
                  }
                >
                  Add usage
                </Button>
              </Stack>
              {usages.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Add rows to recreate pre-go-live session history (no revenue
                  journals).
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {usages.map((row, index) => (
                    <Stack
                      key={index}
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      alignItems={{ sm: "flex-start" }}
                    >
                      <Autocomplete
                        size="small"
                        options={templateOptions}
                        value={
                          templateOptions.find(
                            (opt) =>
                              Number(opt.id) ===
                              Number(row.treatment_template_id),
                          ) ?? null
                        }
                        onChange={(_, next) =>
                          setUsages((prev) =>
                            prev.map((entry, i) =>
                              i === index
                                ? {
                                    ...entry,
                                    treatment_template_id: next?.id ?? "",
                                  }
                                : entry,
                            ),
                          )
                        }
                        getOptionLabel={(opt) => opt?.name ?? ""}
                        isOptionEqualToValue={(a, b) =>
                          Number(a?.id) === Number(b?.id)
                        }
                        sx={{ flex: 1, minWidth: { sm: 200 } }}
                        renderInput={(params) => (
                          <TextField {...params} label="Treatment" />
                        )}
                      />
                      <TextField
                        label="Used date"
                        type="date"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        value={row.used_at}
                        onChange={(e) =>
                          setUsages((prev) =>
                            prev.map((entry, i) =>
                              i === index
                                ? { ...entry, used_at: e.target.value }
                                : entry,
                            ),
                          )
                        }
                        sx={{ width: { xs: "100%", sm: 170 } }}
                      />
                      <TextField
                        label="Sessions"
                        type="number"
                        size="small"
                        inputProps={{ min: 0.25, step: 0.25 }}
                        value={row.used_sessions}
                        onChange={(e) =>
                          setUsages((prev) =>
                            prev.map((entry, i) =>
                              i === index
                                ? { ...entry, used_sessions: e.target.value }
                                : entry,
                            ),
                          )
                        }
                        sx={{ width: { xs: "100%", sm: 120 } }}
                      />
                      <IconButton
                        aria-label="Remove usage row"
                        onClick={() =>
                          setUsages((prev) =>
                            prev.filter((_, i) => i !== index),
                          )
                        }
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Box>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSubmit()}
          disabled={saving || !canSubmit}
        >
          {saving ? <LoadingIndicator size={22} /> : "Import"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
