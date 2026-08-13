import { useCallback, useMemo, useState } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  Chip,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import dayjs from "dayjs";
import {
  previewFixedAssetImport,
  commitFixedAssetImport,
  cancelFixedAssetImport,
} from "../../services/financeService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import useConfirmStore from "../../stores/confirmStore";
import { FinancePageHeader, useFinanceTokens } from "../../components/finance";
import { formatKyats } from "../../utils/formatKyats";
import useAuthStore from "../../stores/authStore";
import { getWorkspaceUrlPrefix } from "../../utils/workspaceRoutes";

const STEPS = ["upload", "preview", "done"];

export default function FinanceFixedAssetsImportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { pushToast } = useToastStore();
  const { askConfirm } = useConfirmStore();
  const { financeSurfaceSx } = useFinanceTokens();

  const rolePrefix = useMemo(() => {
    const fromPath = location.pathname.split("/").filter(Boolean)[0];
    const pathPrefix = fromPath ? `/${fromPath}` : "";
    const workspacePrefix = getWorkspaceUrlPrefix(user);
    if (pathPrefix && pathPrefix === workspacePrefix) {
      return pathPrefix;
    }
    return workspacePrefix || pathPrefix;
  }, [location.pathname, user]);

  const [step, setStep] = useState("upload");
  const [file, setFile] = useState(null);
  const [snapshotDate, setSnapshotDate] = useState("2024-08-31");
  const [buildingDate, setBuildingDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [rowFilter, setRowFilter] = useState("");
  const [lastPreviewBuildingDate, setLastPreviewBuildingDate] = useState("");

  const filteredRows = useMemo(() => {
    const rows = preview?.rows ?? [];
    if (!rowFilter.trim()) return rows;
    const q = rowFilter.trim().toLowerCase();
    return rows.filter((r) =>
      [r.asset_code, r.asset_name, r.category_code, r.status]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(q)),
    );
  }, [preview, rowFilter]);

  const needsBuildingDate = useMemo(
    () => (preview?.rows ?? []).some((r) => r.needs_building_completion_date),
    [preview],
  );

  const committableCount = preview?.summary?.to_import ?? 0;

  const commitBlockedReason = useMemo(() => {
    if (!preview) return null;
    if (committableCount <= 0) {
      return "No rows are ready to import. Fix error rows or adjust the file and preview again.";
    }
    if (needsBuildingDate && !buildingDate) {
      return "Set the building completion date below (required for building/AC rows without depreciation data), then update preview.";
    }
    if (needsBuildingDate && buildingDate && buildingDate !== lastPreviewBuildingDate) {
      return "Building completion date changed — click Update preview before committing.";
    }
    const errorCount = preview.summary?.errors ?? 0;
    if (errorCount > 0) {
      return `${errorCount} row(s) have errors and will be skipped. ${committableCount} row(s) can still be imported.`;
    }
    return null;
  }, [preview, committableCount, needsBuildingDate, buildingDate, lastPreviewBuildingDate]);

  const canCommit =
    !loading &&
    committableCount > 0 &&
    !(needsBuildingDate && !buildingDate) &&
    !(needsBuildingDate && buildingDate !== lastPreviewBuildingDate);

  const handleRepreview = async () => {
    if (!file) {
      pushToast({
        message: "Upload the file again to change snapshot or building dates.",
        severity: "warning",
      });
      setStep("upload");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("snapshot_date", snapshotDate);
      if (buildingDate) fd.append("building_completion_date", buildingDate);
      const result = await previewFixedAssetImport(fd);
      setPreview(result);
      setLastPreviewBuildingDate(buildingDate);
      setStep("preview");
    } catch (e) {
      pushToast({ message: resolveApiError(e, "Preview failed."), severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!file) {
      pushToast({ message: "Choose an Excel file first.", severity: "warning" });
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("snapshot_date", snapshotDate);
      if (buildingDate) fd.append("building_completion_date", buildingDate);
      const result = await previewFixedAssetImport(fd);
      setPreview(result);
      setLastPreviewBuildingDate(buildingDate);
      setStep("preview");
    } catch (e) {
      pushToast({ message: resolveApiError(e, "Preview failed."), severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview?.batch_id) return;
    const count = preview?.summary?.to_import ?? 0;
    const ok = await askConfirm({
      title: "Import assets?",
      message: `Import ${count} assets from this file? Each asset is stored at net book value with remaining useful life. No acquisition journal entries will be posted.`,
      confirmText: "Import",
    });
    if (!ok) return;

    setLoading(true);
    try {
      const result = await commitFixedAssetImport(preview.batch_id);
      pushToast({
        message: `Imported ${result.imported ?? count} assets.`,
        severity: "success",
      });
      navigate(`${rolePrefix}/finance/fixed-assets`, {
        state: { import_batch_id: preview.batch_id },
      });
    } catch (e) {
      pushToast({ message: resolveApiError(e, "Commit failed."), severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = useCallback(async () => {
    if (!preview?.batch_id) {
      setStep("upload");
      setPreview(null);
      return;
    }
    try {
      await cancelFixedAssetImport(preview.batch_id);
    } catch {
      // ignore cancel errors
    }
    setPreview(null);
    setStep("upload");
  }, [preview]);

  return (
    <Box sx={{ ...financeSurfaceSx, p: { xs: 2, sm: 3 } }}>
      <FinancePageHeader
        title="Import fixed assets"
        subtitle="Opening-balance Excel import for go-live. New purchases after go-live must use the expense flow."
        actions={
          <Button component={RouterLink} to={`${rolePrefix}/finance/fixed-assets`}>
            Back to register
          </Button>
        }
      />

      {step === "upload" ? (
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Stack spacing={2} maxWidth={480}>
            <Alert severity="info" variant="outlined">
              Upload the client asset register (.xlsx). Each row is imported as
              net book value (Balance column) with remaining useful months —
              historical cost and accumulated depreciation are not kept.
              Default cutover / snapshot date is 31-08-2024.
            </Alert>
            <Button variant="outlined" component="label" startIcon={<UploadFileIcon />}>
              {file ? file.name : "Choose Excel file"}
              <input
                type="file"
                hidden
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </Button>
            <TextField
              label="Snapshot date"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={snapshotDate}
              onChange={(e) => setSnapshotDate(e.target.value)}
            />
            <TextField
              label="Building completion date"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={buildingDate}
              onChange={(e) => setBuildingDate(e.target.value)}
              helperText="Required if the file contains building/AC rows without depreciation data"
            />
            <Button
              variant="contained"
              onClick={() => void handlePreview()}
              disabled={loading || !file}
            >
              {loading ? <LoadingIndicator size={22} /> : "Preview import"}
            </Button>
          </Stack>
        </Paper>
      ) : null}

      {step === "preview" && preview ? (
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
              Summary
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <Typography variant="body2">To import: {committableCount}</Typography>
              <Typography variant="body2">Skipped: {preview.summary?.skipped ?? 0}</Typography>
              <Typography variant="body2">Warnings: {preview.summary?.warnings ?? 0}</Typography>
              <Typography variant="body2">Errors: {preview.summary?.errors ?? 0}</Typography>
            </Stack>
            {commitBlockedReason ? (
              <Alert
                severity={canCommit ? "info" : "warning"}
                sx={{ mt: 2 }}
              >
                {commitBlockedReason}
              </Alert>
            ) : null}
            {needsBuildingDate || buildingDate ? (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                sx={{ mt: 2 }}
                alignItems={{ sm: "flex-end" }}
              >
                <TextField
                  label="Building completion date"
                  type="date"
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  value={buildingDate}
                  onChange={(e) => setBuildingDate(e.target.value)}
                  helperText="Required for building/AC/CCTV rows without useful life in the file"
                  sx={{ minWidth: 220 }}
                />
                <Button
                  variant="outlined"
                  onClick={() => void handleRepreview()}
                  disabled={loading || (needsBuildingDate && !buildingDate)}
                >
                  Update preview
                </Button>
              </Stack>
            ) : null}
          </Paper>

          <TextField
            size="small"
            placeholder="Filter rows…"
            value={rowFilter}
            onChange={(e) => setRowFilter(e.target.value)}
            sx={{ maxWidth: 320 }}
          />

          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Row</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">NBV (deemed cost)</TableCell>
                  <TableCell align="right">Remaining months</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.map((row, idx) => (
                  <TableRow key={`${row.row_number}-${row.asset_code}-${idx}`}>
                    <TableCell>{row.row_number}</TableCell>
                    <TableCell>{row.asset_code}</TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>{row.asset_name}</TableCell>
                    <TableCell>{row.category_code}</TableCell>
                    <TableCell align="right">
                      {formatKyats(
                        Number(row.net_book_value ?? row.purchase_cost ?? 0),
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {row.remaining_useful_months ??
                        row.useful_life_months ??
                        "—"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.status}
                        color={
                          row.status === "error"
                            ? "error"
                            : row.status === "warning"
                              ? "warning"
                              : "success"
                        }
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <Stack direction="row" spacing={1}>
            <Button onClick={() => void handleCancel()} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleCommit()}
              disabled={!canCommit}
            >
              {loading ? <LoadingIndicator size={22} /> : "Commit import"}
            </Button>
          </Stack>
        </Stack>
      ) : null}
    </Box>
  );
}
