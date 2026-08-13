import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  TableContainer,
} from "@mui/material";
import HistoryIcon from "@mui/icons-material/History";
import useToastStore from "../../../stores/toastStore";
import { resolveApiError } from "../../../services/apiClient";
import { hasPermission } from "../../../utils/accessUtils";
import useAuthStore from "../../../stores/authStore";
import {
  getPatientPackages,
  getPackages,
  getPatientPackageUsages,
  freezePatientPackage,
  unfreezePatientPackage,
  refundPatientPackage,
  transferPatientPackage,
  upgradePatientPackage,
  syncPatientPackageBeneficiaries,
} from "../../../services/packageService";
import dayjs from "dayjs";

export default function PatientPackagesTab({ patientId }) {
  const { pushToast } = useToastStore();
  const { user } = useAuthStore();
  const canLifecycle = hasPermission(user, "packages.lifecycle");
  const canUpgrade = hasPermission(user, "packages.view");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRows, setHistoryRows] = useState([]);
  const [historyTitle, setHistoryTitle] = useState("");
  const [actionPkg, setActionPkg] = useState(null);
  const [freezeReason, setFreezeReason] = useState("");
  const [transferToId, setTransferToId] = useState("");
  const [upgradePkgId, setUpgradePkgId] = useState("");
  const [beneficiaryIds, setBeneficiaryIds] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPatientPackages(patientId);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not load packages."),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [patientId, pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const openHistory = async (pp) => {
    setHistoryTitle(pp.package?.name ?? `Package #${pp.id}`);
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryRows([]);
    try {
      const data = await getPatientPackageUsages(pp.id);
      setHistoryRows(Array.isArray(data) ? data : []);
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not load usage history."),
        severity: "error",
      });
    } finally {
      setHistoryLoading(false);
    }
  };

  const openLifecycle = async (pp) => {
    setActionPkg(pp);
    setFreezeReason("");
    setTransferToId("");
    setUpgradePkgId("");
    setBeneficiaryIds(
      (pp.beneficiary_patients ?? pp.beneficiaryPatients ?? [])
        .map((p) => p.id)
        .join(", "),
    );
    try {
      const list = await getPackages({ active_only: true });
      setCatalog(Array.isArray(list) ? list : []);
    } catch {
      setCatalog([]);
    }
  };

  const closeLifecycle = () => setActionPkg(null);

  const runFreeze = async () => {
    if (!actionPkg) return;
    try {
      await freezePatientPackage(actionPkg.id, {
        reason: freezeReason || null,
      });
      pushToast({ message: "Package frozen.", severity: "success" });
      closeLifecycle();
      load();
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Freeze failed."),
        severity: "error",
      });
    }
  };

  const runUnfreeze = async () => {
    if (!actionPkg) return;
    try {
      await unfreezePatientPackage(actionPkg.id);
      pushToast({ message: "Package unfrozen.", severity: "success" });
      closeLifecycle();
      load();
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Unfreeze failed."),
        severity: "error",
      });
    }
  };

  const runRefund = async () => {
    if (
      !actionPkg ||
      !window.confirm(
        "Refund this package? Remaining sessions will be cleared.",
      )
    )
      return;
    try {
      await refundPatientPackage(actionPkg.id);
      pushToast({ message: "Package refunded.", severity: "success" });
      closeLifecycle();
      load();
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Refund failed."),
        severity: "error",
      });
    }
  };

  const runTransfer = async () => {
    if (!actionPkg || !transferToId.trim()) return;
    try {
      await transferPatientPackage(actionPkg.id, {
        to_patient_id: Number(transferToId),
      });
      pushToast({ message: "Package transferred.", severity: "success" });
      closeLifecycle();
      load();
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Transfer failed."),
        severity: "error",
      });
    }
  };

  const runUpgrade = async () => {
    if (!actionPkg || !upgradePkgId) return;
    try {
      await upgradePatientPackage(actionPkg.id, {
        package_id: Number(upgradePkgId),
      });
      pushToast({ message: "Package upgraded.", severity: "success" });
      closeLifecycle();
      load();
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Upgrade failed."),
        severity: "error",
      });
    }
  };

  const runBeneficiaries = async () => {
    if (!actionPkg) return;
    const ids = beneficiaryIds
      .split(/[,\s]+/)
      .map((s) => parseInt(String(s).trim(), 10))
      .filter((n) => !Number.isNaN(n) && n > 0);
    try {
      await syncPatientPackageBeneficiaries(actionPkg.id, ids);
      pushToast({ message: "Beneficiaries updated.", severity: "success" });
      closeLifecycle();
      load();
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Could not update beneficiaries."),
        severity: "error",
      });
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Prepaid bundles and remaining sessions per treatment line. Usage is
          recorded from Visit History during a visit.
        </Typography>
      </Stack>

      {rows.length === 0 ? (
        <Alert severity="info">No packages on file for this patient.</Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Package</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Expiry</TableCell>
                <TableCell>Lines (remaining)</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((pp) => {
                const items = pp.items ?? [];
                const lines = items
                  .map(
                    (i) =>
                      `${i.treatment_template?.name ?? "Treatment"}: ${i.remaining_sessions}`,
                  )
                  .join(" · ");
                return (
                  <TableRow key={pp.id}>
                    <TableCell>
                      <Typography fontWeight={600}>
                        {pp.package?.name ?? "—"}
                      </Typography>
                      {pp.frozen_at && (
                        <Chip
                          size="small"
                          label="Frozen"
                          color="warning"
                          sx={{ mt: 0.5 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={pp.status}
                        sx={{ textTransform: "capitalize" }}
                      />
                    </TableCell>
                    <TableCell>
                      {pp.expiry_date
                        ? dayjs(pp.expiry_date).format("YYYY-MM-DD")
                        : "—"}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Typography variant="body2" noWrap title={lines}>
                        {lines || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => openHistory(pp)}
                        title="Usage history"
                      >
                        <HistoryIcon fontSize="small" />
                      </IconButton>
                      {canLifecycle && (
                        <Button size="small" onClick={() => openLifecycle(pp)}>
                          Manage
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Usage history — {historyTitle}</DialogTitle>
        <DialogContent>
          {historyLoading ? (
            <CircularProgress size={28} />
          ) : historyRows.length === 0 ? (
            <Typography color="text.secondary">
              No usage recorded yet.
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>When</TableCell>
                  <TableCell>Sessions</TableCell>
                  <TableCell>Visit</TableCell>
                  <TableCell>Treatment</TableCell>
                  <TableCell>Staff</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyRows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      {u.used_at
                        ? dayjs(u.used_at).format("YYYY-MM-DD HH:mm")
                        : "—"}
                    </TableCell>
                    <TableCell>{u.used_sessions}</TableCell>
                    <TableCell>#{u.visit_id}</TableCell>
                    <TableCell>{u.treatment_id ?? "—"}</TableCell>
                    <TableCell>{u.recorded_by?.name ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(actionPkg)}
        onClose={closeLifecycle}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Package — {actionPkg?.package?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Status: <strong>{actionPkg?.status}</strong>
              {(actionPkg?.sold_by?.name ?? actionPkg?.soldBy?.name) && (
                <>
                  {" "}
                  · Sold by:{" "}
                  {actionPkg?.sold_by?.name ?? actionPkg?.soldBy?.name}
                </>
              )}
              {actionPkg?.commission_amount != null &&
                actionPkg.commission_amount !== "" && (
                  <> · Commission: {actionPkg.commission_amount}</>
                )}
            </Typography>
            <TextField
              label="Freeze reason (optional)"
              value={freezeReason}
              onChange={(e) => setFreezeReason(e.target.value)}
              fullWidth
              size="small"
            />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button size="small" variant="outlined" onClick={runFreeze}>
                Freeze
              </Button>
              <Button size="small" variant="outlined" onClick={runUnfreeze}>
                Unfreeze
              </Button>
              <Button
                size="small"
                color="warning"
                variant="outlined"
                onClick={runRefund}
              >
                Refund
              </Button>
            </Stack>
            <TextField
              label="Transfer to patient ID"
              value={transferToId}
              onChange={(e) => setTransferToId(e.target.value)}
              size="small"
              fullWidth
            />
            <Button size="small" variant="contained" onClick={runTransfer}>
              Transfer
            </Button>
            {canUpgrade && (
              <>
                <FormControl fullWidth size="small">
                  <InputLabel>Upgrade to catalog package</InputLabel>
                  <Select
                    label="Upgrade to catalog package"
                    value={upgradePkgId}
                    onChange={(e) => setUpgradePkgId(e.target.value)}
                  >
                    {catalog.map((p) => (
                      <MenuItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button size="small" variant="contained" onClick={runUpgrade}>
                  Upgrade
                </Button>
              </>
            )}
            <TextField
              label="Beneficiary patient IDs (comma-separated)"
              value={beneficiaryIds}
              onChange={(e) => setBeneficiaryIds(e.target.value)}
              size="small"
              fullWidth
              helperText="Family members who may use this package during their visits."
            />
            <Button size="small" variant="outlined" onClick={runBeneficiaries}>
              Save beneficiaries
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeLifecycle}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
