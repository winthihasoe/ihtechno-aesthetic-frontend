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
import {
  importPatients,
  previewPatientImport,
} from "../../../services/patientService";
import { resolveApiError } from "../../../services/apiClient";
import useToastStore from "../../../stores/toastStore";

function buildInitialActions(rows) {
  const actions = {};
  rows.forEach((row) => {
    const hasDuplicates = (row.duplicate_matches?.length ?? 0) > 0;
    actions[row.row_index] = {
      action: hasDuplicates ? row.suggested_action || "skip" : "new",
      patient_id: hasDuplicates
        ? (row.duplicate_matches?.[0]?.id ?? null)
        : null,
    };
  });
  return actions;
}

function formatWarnings(warnings) {
  if (!warnings?.length) return "-";
  return warnings
    .map((w) =>
      w === "missing_phone"
        ? "No phone"
        : w === "invalid_phone"
          ? "Invalid phone"
          : w === "invalid_dob"
            ? "Invalid DOB"
            : w,
    )
    .join(", ");
}

export default function PatientImportDialog({ open, onClose, onImported }) {
  const { pushToast } = useToastStore();
  const [importFile, setImportFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [rowActions, setRowActions] = useState({});
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);

  const duplicateRows = useMemo(
    () =>
      (preview?.rows ?? []).filter(
        (row) => (row.duplicate_matches?.length ?? 0) > 0,
      ),
    [preview],
  );

  const canImport = useMemo(() => {
    if (!preview?.can_import || !importFile) return false;
    return duplicateRows.every((row) => {
      const action = rowActions[row.row_index];
      if (!action?.action) return false;
      if (action.action === "override" && !action.patient_id) return false;
      return true;
    });
  }, [preview, importFile, duplicateRows, rowActions]);

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
      const result = await previewPatientImport(importFile);
      setPreview(result);
      setRowActions(buildInitialActions(result.rows ?? []));
    } catch (error) {
      setPreview(null);
      setRowActions({});
      pushToast({
        message: resolveApiError(error, "Failed to preview patient import."),
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
        const action = rowActions[row.row_index] ?? { action: "new" };
        return {
          row_index: row.row_index,
          action: action.action,
          ...(action.action === "override" && action.patient_id
            ? { patient_id: action.patient_id }
            : {}),
        };
      });

      const result = await importPatients(importFile, actionsPayload);
      pushToast({
        message: `Imported ${result.created} new, updated ${result.updated}, skipped ${result.skipped}.${result.failed ? ` ${result.failed} failed.` : ""}`,
        severity: result.failed ? "warning" : "success",
      });
      onImported?.();
      handleClose();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to import patients."),
        severity: "error",
      });
    } finally {
      setImporting(false);
    }
  };

  const setRowAction = (rowIndex, patch) => {
    setRowActions((prev) => ({
      ...prev,
      [rowIndex]: { ...prev[rowIndex], ...patch },
    }));
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Import Patients</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Upload a client list Excel file (.xlsx). Preview rows, resolve
            duplicates, then import.
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
              {previewing ? "Previewing..." : "Preview"}
            </Button>
          </Stack>

          {preview ? (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  label={`Total: ${preview.summary?.total ?? 0}`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Ready: ${preview.summary?.ready ?? 0}`}
                />
                <Chip
                  size="small"
                  color={preview.summary?.duplicates ? "warning" : "default"}
                  label={`Duplicates: ${preview.summary?.duplicates ?? 0}`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Warnings: ${preview.summary?.warnings ?? 0}`}
                />
              </Stack>

              {duplicateRows.length > 0 ? (
                <Alert severity="info">
                  Rows with possible duplicates need an action: Skip, Override
                  an existing patient, or create New anyway.
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
                      <TableCell>Row</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Client ID</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Warnings</TableCell>
                      <TableCell>Duplicate</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(preview.rows ?? []).map((row) => {
                      const hasDuplicates =
                        (row.duplicate_matches?.length ?? 0) > 0;
                      const actionState = rowActions[row.row_index] ?? {
                        action: "new",
                      };
                      const isAutoClientId =
                        row.parsed?.client_id_source === "auto";

                      return (
                        <TableRow key={row.row_index} hover>
                          <TableCell>{row.row_index}</TableCell>
                          <TableCell>{row.parsed?.name}</TableCell>
                          <TableCell>
                            <Stack
                              direction="row"
                              spacing={0.5}
                              alignItems="center"
                            >
                              <span>{row.parsed?.client_id || "-"}</span>
                              {isAutoClientId ? (
                                <Chip size="small" label="Auto" color="info" />
                              ) : null}
                            </Stack>
                          </TableCell>
                          <TableCell>{row.parsed?.phone || "-"}</TableCell>
                          <TableCell
                            sx={{ color: "text.secondary", fontSize: "0.8rem" }}
                          >
                            {formatWarnings(row.warnings)}
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.8rem" }}>
                            {hasDuplicates
                              ? row.duplicate_matches
                                  .map(
                                    (m) =>
                                      `#${m.id} ${m.name}${m.client_id ? ` (${m.client_id})` : ""}`,
                                  )
                                  .join("; ")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {hasDuplicates ? (
                              <Stack spacing={1}>
                                <ToggleButtonGroup
                                  size="small"
                                  exclusive
                                  value={actionState.action}
                                  onChange={(_, value) => {
                                    if (!value) return;
                                    setRowAction(row.row_index, {
                                      action: value,
                                      patient_id:
                                        value === "override"
                                          ? (row.duplicate_matches?.[0]?.id ??
                                            null)
                                          : null,
                                    });
                                  }}
                                >
                                  <ToggleButton value="skip">Skip</ToggleButton>
                                  <ToggleButton value="override">
                                    Override
                                  </ToggleButton>
                                  <ToggleButton value="new">New</ToggleButton>
                                </ToggleButtonGroup>
                                {actionState.action === "override" &&
                                (row.duplicate_matches?.length ?? 0) > 1 ? (
                                  <TextField
                                    select
                                    size="small"
                                    label="Override patient"
                                    value={actionState.patient_id ?? ""}
                                    onChange={(e) =>
                                      setRowAction(row.row_index, {
                                        patient_id: Number(e.target.value),
                                      })
                                    }
                                    sx={{ minWidth: 220 }}
                                  >
                                    {row.duplicate_matches.map((match) => (
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
                              <Chip
                                size="small"
                                label="Create"
                                color="success"
                              />
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
          {importing ? "Importing..." : "Import"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
