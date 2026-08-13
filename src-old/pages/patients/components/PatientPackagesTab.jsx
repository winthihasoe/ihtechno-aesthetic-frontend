import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../../components/common/LoadingIndicator";
import useToastStore from "../../../stores/toastStore";
import { resolveApiError } from "../../../services/apiClient";
import { hasPermission } from "../../../utils/accessUtils";
import useAuthStore from "../../../stores/authStore";
import {
  assignPatientPackage,
  freezePatientPackage,
  getPackages,
  getPatientPackages,
  syncPatientPackageBeneficiaries,
  transferPatientPackage,
  unfreezePatientPackage,
} from "../../../services/packageService";
import { getPatientStoreCredit } from "../../../services/storeCreditService";
import PatientTabEmptyState from "./PatientTabEmptyState";
import PackageCard from "./PackageCard";
import PackageTabHeader, { ClosedPackagesExpander, StoreCreditLedgerDrawer } from "./PackageTabHeader";
import PatientAutocomplete from "./PatientAutocomplete";
import TradeInStepperDialog from "./dialogs/TradeInStepperDialog";
import UsageHistoryDialog from "./dialogs/UsageHistoryDialog";

const TERMINAL = new Set(["traded_in", "cancelled", "refunded"]);

export default function PatientPackagesTab({ patientId }) {
  const { pushToast } = useToastStore();
  const { user } = useAuthStore();
  const canLifecycle = hasPermission(user, "packages.lifecycle");
  const canTrade = hasPermission(user, "packages.trade");
  const canSell = hasPermission(user, "packages.sell") || hasPermission(user, "packages.assign");
  const canCommercials = hasPermission(user, "packages.view_commercials");
  const canViewStoreCredit = hasPermission(user, "patient.store_credit.view");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState([]);
  const [storeCredit, setStoreCredit] = useState({ balance: 0, entries: [] });
  const [ledgerOpen, setLedgerOpen] = useState(false);

  const [historyPkg, setHistoryPkg] = useState(null);
  const [tradePkg, setTradePkg] = useState(null);
  const [sellOpen, setSellOpen] = useState(false);
  const [freezePkg, setFreezePkg] = useState(null);
  const [transferPkg, setTransferPkg] = useState(null);
  const [beneficiaryPkg, setBeneficiaryPkg] = useState(null);

  const [sellTarget, setSellTarget] = useState(null);
  const [freezeReason, setFreezeReason] = useState("");
  const [transferPatient, setTransferPatient] = useState(null);
  const [beneficiaryPatients, setBeneficiaryPatients] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pkgData, catalogData, creditData] = await Promise.all([
        getPatientPackages(patientId),
        getPackages({ active: 1 }).catch(() => []),
        canViewStoreCredit
          ? getPatientStoreCredit(patientId).catch(() => ({ balance: 0, entries: [] }))
          : Promise.resolve({ balance: 0, entries: [] }),
      ]);
      setRows(Array.isArray(pkgData) ? pkgData : []);
      setCatalog(Array.isArray(catalogData) ? catalogData : []);
      setStoreCredit(creditData);
    } catch (err) {
      pushToast({ message: resolveApiError(err, "Could not load packages."), severity: "error" });
    } finally {
      setLoading(false);
    }
  }, [patientId, pushToast, canViewStoreCredit]);

  useEffect(() => {
    load();
  }, [load]);

  const { activeRows, closedRows } = useMemo(() => {
    const active = [];
    const closed = [];
    rows.forEach((r) => {
      if (TERMINAL.has(r.status)) closed.push(r);
      else active.push(r);
    });
    return { activeRows: active, closedRows: closed };
  }, [rows]);

  const handleSell = async () => {
    if (!sellTarget) return;
    setSubmitting(true);
    try {
      await assignPatientPackage(patientId, { package_id: sellTarget.id });
      pushToast({ message: "Package sold.", severity: "success" });
      setSellOpen(false);
      setSellTarget(null);
      load();
    } catch (err) {
      pushToast({ message: resolveApiError(err, "Could not sell package."), severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleFreeze = async () => {
    setSubmitting(true);
    try {
      await freezePatientPackage(freezePkg.id, { reason: freezeReason });
      pushToast({ message: "Package frozen.", severity: "success" });
      setFreezePkg(null);
      setFreezeReason("");
      load();
    } catch (err) {
      pushToast({ message: resolveApiError(err, "Could not freeze package."), severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnfreeze = async (pkg) => {
    try {
      await unfreezePatientPackage(pkg.id);
      pushToast({ message: "Package unfrozen.", severity: "success" });
      load();
    } catch (err) {
      pushToast({ message: resolveApiError(err, "Could not unfreeze package."), severity: "error" });
    }
  };

  const handleTransfer = async () => {
    if (!transferPatient?.id) return;
    setSubmitting(true);
    try {
      await transferPatientPackage(transferPkg.id, { to_patient_id: transferPatient.id });
      pushToast({ message: "Package transferred.", severity: "success" });
      setTransferPkg(null);
      setTransferPatient(null);
      load();
    } catch (err) {
      pushToast({ message: resolveApiError(err, "Could not transfer package."), severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBeneficiaries = async () => {
    setSubmitting(true);
    try {
      const ids = (beneficiaryPatients || []).map((p) => p.id);
      await syncPatientPackageBeneficiaries(beneficiaryPkg.id, ids);
      pushToast({ message: "Beneficiaries updated.", severity: "success" });
      setBeneficiaryPkg(null);
      setBeneficiaryPatients([]);
      load();
    } catch (err) {
      pushToast({ message: resolveApiError(err, "Could not update beneficiaries."), severity: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
        <LoadingIndicator size={32} />
      </Box>
    );
  }

  return (
    <Box>
      <PackageTabHeader
        storeCreditBalance={Number(storeCredit.balance || 0)}
        canSell={canSell}
        canViewStoreCredit={canViewStoreCredit}
        onSell={() => setSellOpen(true)}
        onViewLedger={() => setLedgerOpen(true)}
      />

      {rows.length === 0 ? (
        <PatientTabEmptyState
          title="No packages on file for this patient"
          description="Sell a prepaid package to track sessions and usage here."
          steps={["Use Sell package to assign a catalog bundle.", "Sessions can be consumed during visits."]}
          previewFields={["Package", "Remaining sessions", "Expiry"]}
          action={
            canSell ? (
              <Button variant="contained" sx={{ mt: 2 }} onClick={() => setSellOpen(true)}>
                + Sell package
              </Button>
            ) : null
          }
        />
      ) : (
        <Stack spacing={2}>
          {activeRows.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              canCommercials={canCommercials}
              canTrade={canTrade}
              canLifecycle={canLifecycle}
              onUsageHistory={setHistoryPkg}
              onTradeIn={setTradePkg}
              onFreeze={setFreezePkg}
              onUnfreeze={handleUnfreeze}
              onTransfer={setTransferPkg}
              onBeneficiaries={(p) => {
                setBeneficiaryPkg(p);
                setBeneficiaryPatients(p.beneficiary_patients || p.beneficiaryPatients || []);
              }}
            />
          ))}
          <ClosedPackagesExpander
            packages={closedRows}
            canCommercials={canCommercials}
            onUsageHistory={setHistoryPkg}
          />
        </Stack>
      )}

      <StoreCreditLedgerDrawer
        open={ledgerOpen}
        onClose={() => setLedgerOpen(false)}
        entries={storeCredit.entries}
        balance={storeCredit.balance}
      />

      <UsageHistoryDialog patientPackage={historyPkg} onClose={() => setHistoryPkg(null)} />

      <TradeInStepperDialog
        open={Boolean(tradePkg)}
        patientPackage={tradePkg}
        onClose={() => setTradePkg(null)}
        onDone={load}
      />

      <Dialog open={sellOpen} onClose={() => setSellOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Sell package</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={catalog}
            getOptionLabel={(o) => o.name || ""}
            value={sellTarget}
            onChange={(_, v) => setSellTarget(v)}
            renderInput={(params) => <TextField {...params} label="Catalog package" />}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSellOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!sellTarget || submitting} onClick={handleSell}>
            Sell
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(freezePkg)} onClose={() => setFreezePkg(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Freeze package</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Reason"
            value={freezeReason}
            onChange={(e) => setFreezeReason(e.target.value)}
            multiline
            minRows={2}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFreezePkg(null)}>Cancel</Button>
          <Button variant="contained" disabled={submitting} onClick={handleFreeze}>
            Freeze
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(transferPkg)} onClose={() => setTransferPkg(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Transfer package</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Transfer will create a new package for the target patient and cancel this one. Beneficiaries are cleared.
          </Alert>
          <PatientAutocomplete
            label="Transfer to patient"
            value={transferPatient}
            onChange={setTransferPatient}
            excludePatientId={patientId}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferPkg(null)}>Cancel</Button>
          <Button variant="contained" disabled={!transferPatient || submitting} onClick={handleTransfer}>
            Transfer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(beneficiaryPkg)} onClose={() => setBeneficiaryPkg(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit beneficiaries</DialogTitle>
        <DialogContent>
          <PatientAutocomplete
            label="Beneficiary patients"
            multiple
            value={beneficiaryPatients}
            onChange={setBeneficiaryPatients}
            excludePatientId={patientId}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBeneficiaryPkg(null)}>Cancel</Button>
          <Button variant="contained" disabled={submitting} onClick={handleBeneficiaries}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
