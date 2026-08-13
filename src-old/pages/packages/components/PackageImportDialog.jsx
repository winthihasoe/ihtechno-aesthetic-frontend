import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import LoadingIndicator from "../../../components/common/LoadingIndicator";
import {
  importPackages,
  previewPackageImport,
} from "../../../services/packageService";
import { resolveApiError } from "../../../services/apiClient";
import useToastStore from "../../../stores/toastStore";

const ERROR_LABELS = {
  patient_not_found: "Patient not found",
  package_not_found: "Catalog package not found",
  missing_purchased_at: "Missing purchase date",
  package_expired: "Package expired",
  invalid_treatment_template: "Invalid treatment template",
  treatment_not_in_package: "Treatment not in package",
  remaining_out_of_bounds: "Remaining sessions out of bounds",
  no_valid_items: "No valid package items",
  invalid_usage_template: "Invalid usage template",
  invalid_used_at: "Invalid usage date",
  invalid_used_sessions: "Invalid used sessions",
};

const WARNING_LABELS = {
  balance_mismatch: "Balance mismatch",
  total_sessions_mismatch: "Total sessions mismatch",
  invalid_purchased_at: "Invalid purchase date",
  invalid_expiry_date: "Invalid expiry date",
};

function buildInitialActions(rows) {
  const actions = {};
  rows.forEach((row) => {
    const packageRef = row.package_ref;
    const patientMatches = (row.duplicate_matches ?? []).filter(
      (m) => !String(m.name ?? "").startsWith("Already imported"),
    );
    const hasAmbiguousPatient = patientMatches.length > 1;
    const alreadyImported = row.existing_import;

    actions[packageRef] = {
      action: alreadyImported || hasAmbiguousPatient
        ? row.suggested_action || "skip"
        : row.can_import
          ? "new"
          : "skip",
      patient_id: hasAmbiguousPatient ? (patientMatches[0]?.id ?? null) : null,
    };
  });
  return actions;
}

function formatList(values, labels) {
  if (!values?.length) return "-";
  return values.map((v) => labels[v] ?? v).join(", ");
}

function formatItems(items) {
  if (!items?.length) return "-";
  return items
    .map(
      (item) =>
        `${item.treatment_template_name ?? item.treatment_template_id}: ${item.remaining_sessions}/${item.total_sessions}`,
    )
    .join("; ");
}

export default function PackageImportDialog({ open, onClose, onImported }) {
  const { pushToast } = useToastStore();
  const [importFile, setImportFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [rowActions, setRowActions] = useState({});
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);

  const actionableRows = useMemo(
    () =>
      (preview?.rows ?? []).filter(
        (row) =>
          (row.duplicate_matches?.length ?? 0) > 1 && !row.existing_import,
      ),
    [preview],
  );

  const canImport = useMemo(() => {
    if (!preview?.can_import || !importFile) return false;

    return (preview.rows ?? []).some((row) => {
      const action = rowActions[row.package_ref];
      if (!action?.action || action.action === "skip") return false;
      if (!row.can_import && action.action !== "override") return false;
      if (action.action === "override" && !action.patient_id) return false;
      return true;
    });
  }, [preview, importFile, rowActions]);

  const resetState = () => {
    setImportFile(null);
    setPreview(null);
    setRowActions({});
    setPreviewing(false);
    setImporting(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handlePreview = async () => {
    if (!importFile) return;
    setPreviewing(true);
    try {
      const result = await previewPackageImport(importFile);
      setPreview(result);
      setRowActions(buildInitialActions(result.rows ?? []));
    } catch (error) {
      setPreview(null);
      setRowActions({});
      pushToast({
        message: resolveApiError(error, "Failed to preview package import."),
        severity: "error",
      });
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!importFile || !canImport) return;
    setImporting(true);
    try {
      const actionsPayload = (preview?.rows ?? []).map((row) => {
        const action = rowActions[row.package_ref] ?? { action: "skip" };
        return {
          package_ref: row.package_ref,
          action: action.action,
          ...(action.action === "override" && action.patient_id
            ? { patient_id: action.patient_id }
            : {}),
        };
      });

      const result = await importPackages(importFile, actionsPayload);
      pushToast({
        message: `Imported ${result.created_packages ?? 0} package(s), ${result.created_usages ?? 0} usage(s), skipped ${result.skipped ?? 0}.${result.failed ? ` ${result.failed} failed.` : ""}`,
        severity: result.failed ? "warning" : "success",
      });
      onImported?.();
      handleClose();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to import packages."),
        severity: "error",
      });
    } finally {
      setImporting(false);
    }
  };

  const setRowAction = (packageRef, patch) => {
    setRowActions((prev) => ({
      ...prev,
      [packageRef]: { ...prev[packageRef], ...patch },
    }));
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Import legacy packages (Excel)</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Upload an Excel file (.xlsx) with <strong>packages</strong> and{" "}
            <strong>usages</strong> sheets. Preview rows, resolve patient
            matches, then import mid-life balances and historical usage.
          </Typography>

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            alignItems={{ sm: "center" }}
          >
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFileIcon />}
            >
              {importFile ? importFile.name : "Choose file"}
              <input
                hidden
                type="file"
                accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => {
                  setImportFile(e.target.files?.[0] || null);
                  setPreview(null);
                  setRowActions({});
                }}
              />
            </Button>
            <Button
              variant="outlined"
              disabled={!importFile || previewing}
              onClick={handlePreview}
            >
              {previewing ? <LoadingIndicator size={22} /> : "Preview"}
            </Button>
          </Stack>

          {preview ? (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  label={`Packages: ${preview.summary?.packages ?? 0}`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Items: ${preview.summary?.items ?? 0}`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Usages: ${preview.summary?.usages ?? 0}`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Ready: ${preview.summary?.ready ?? 0}`}
                />
                <Chip
                  size="small"
                  color={preview.summary?.warnings ? "warning" : "default"}
                  label={`Warnings: ${preview.summary?.warnings ?? 0}`}
                />
                <Chip
                  size="small"
                  color={preview.summary?.errors ? "error" : "default"}
                  label={`Errors: ${preview.summary?.errors ?? 0}`}
                />
              </Stack>

              {actionableRows.length > 0 ? (
                <Alert severity="info">
                  Rows with multiple patient matches need an action: Skip or
                  Override to pick the correct patient.
                </Alert>
              ) : null}

              <TableContainer sx={{ maxHeight: 420, borderRadius: 1 }}>
                <Table
                  size="small"
                  stickyHeader
                  sx={{
                    "& .MuiTableCell-head": {
                      bgcolor: "background.default",
                    },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Ref</TableCell>
                      <TableCell>Patient</TableCell>
                      <TableCell>Package</TableCell>
                      <TableCell>Items</TableCell>
                      <TableCell>Expiry</TableCell>
                      <TableCell>Issues</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(preview.rows ?? []).map((row) => {
                      const patientMatches = (row.duplicate_matches ?? []).filter(
                        (m) => !String(m.name ?? "").startsWith("Already imported"),
                      );
                      const hasAmbiguousPatient = patientMatches.length > 1;
                      const actionState = rowActions[row.package_ref] ?? {
                        action: "skip",
                      };

                      return (
                        <TableRow key={row.package_ref} hover>
                          <TableCell>{row.package_ref}</TableCell>
                          <TableCell>
                            {row.parsed?.patient?.name ??
                              row.parsed?.patient_lookup?.name ??
                              row.parsed?.patient_lookup?.client_id ??
                              "-"}
                          </TableCell>
                          <TableCell>
                            {row.parsed?.package?.name ?? "-"}
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.8rem" }}>
                            {formatItems(row.parsed?.items)}
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.8rem" }}>
                            {row.parsed?.expiry_date ?? "-"}
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.8rem" }}>
                            {row.existing_import ? (
                              <Chip size="small" label="Already imported" />
                            ) : null}
                            {formatList(row.errors, ERROR_LABELS)}
                            {row.warnings?.length
                              ? ` · ${formatList(row.warnings, WARNING_LABELS)}`
                              : ""}
                          </TableCell>
                          <TableCell>
                            {row.existing_import ? (
                              <Chip size="small" label="Skip" />
                            ) : !row.can_import ? (
                              <Chip size="small" color="error" label="Blocked" />
                            ) : hasAmbiguousPatient ? (
                              <Stack spacing={1}>
                                <ToggleButtonGroup
                                  size="small"
                                  exclusive
                                  value={actionState.action}
                                  onChange={(_, value) => {
                                    if (!value) return;
                                    setRowAction(row.package_ref, {
                                      action: value,
                                      patient_id:
                                        value === "override"
                                          ? (patientMatches[0]?.id ?? null)
                                          : null,
                                    });
                                  }}
                                >
                                  <ToggleButton value="skip">Skip</ToggleButton>
                                  <ToggleButton value="override">
                                    Override
                                  </ToggleButton>
                                  <ToggleButton value="new">Import</ToggleButton>
                                </ToggleButtonGroup>
                                {actionState.action === "override" &&
                                patientMatches.length > 1 ? (
                                  <TextField
                                    select
                                    size="small"
                                    label="Patient"
                                    value={actionState.patient_id ?? ""}
                                    onChange={(e) =>
                                      setRowAction(row.package_ref, {
                                        patient_id: Number(e.target.value),
                                      })
                                    }
                                    sx={{ minWidth: 220 }}
                                  >
                                    {patientMatches.map((match) => (
                                      <MenuItem key={match.id} value={match.id}>
                                        #{match.id} {match.name}
                                        {match.client_id
                                          ? ` (${match.client_id})`
                                          : ""}
                                      </MenuItem>
                                    ))}
                                  </TextField>
                                ) : null}
                              </Stack>
                            ) : (
                              <Chip size="small" label="Import" color="success" />
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!canImport || importing}
          onClick={handleImport}
        >
          {importing ? <LoadingIndicator size={22} /> : "Import"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
