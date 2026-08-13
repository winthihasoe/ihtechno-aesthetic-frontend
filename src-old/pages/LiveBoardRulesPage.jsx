import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../components/common/LoadingIndicator";
import SaveIcon from "@mui/icons-material/Save";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import useToastStore from "../stores/toastStore";
import useConfirmStore from "../stores/confirmStore";
import { resolveApiError } from "../services/apiClient";
import {
  getLiveboardRules,
  updateLiveboardRules,
  getLiveboardCloseSettings,
  updateLiveboardCloseSettings,
} from "../services/settingsService";
import { runLiveboardCloseDay } from "../services/visitService";
import { getRoles } from "../services/rolesService";
import { DEFAULT_LIVEBOARD_RULES } from "../utils/roleUtils";

const BUTTON_RULES = [
  { key: "open_panel", label: "Open panel" },
  { key: "start_consulting", label: "Start Consulting" },
  { key: "do_not_consulting", label: "Do not consulting" },
  { key: "open_consulting", label: "Open Consulting" },
  { key: "send_to_preparation", label: "Send to Preparation" },
  { key: "proceed_treatment", label: "Proceed Treatment" },
  { key: "start_treatment", label: "Start Treatment" },
  { key: "mark_done", label: "Mark done" },
  { key: "go_to_invoice", label: "Go to Invoice" },
  { key: "handover_request", label: "Handover request" },
  { key: "handover_accept", label: "Handover accept" },
  { key: "doctor_handover_request", label: "Doctor treatment handover request" },
  { key: "doctor_handover_accept", label: "Doctor treatment handover accept" },
];

const DEFAULT_CARRYOVER_ROLES = [
  "owner",
  "admin",
  "reception",
  "medical_officer",
];

const ROLE_LABEL_OVERRIDES = {
  medical_officer: "Medical Officer",
  sales_marketing: "Sales Marketing",
};

const ROLE_FALLBACK = [
  { slug: "owner", name: "Owner" },
  { slug: "admin", name: "Admin" },
  { slug: "reception", name: "Reception" },
  { slug: "sales_marketing", name: "Sales Marketing" },
  { slug: "medical_officer", name: "Medical Officer" },
  { slug: "physician", name: "Physician" },
  { slug: "therapist", name: "Therapist" },
  { slug: "cashier", name: "Cashier" },
  { slug: "hr", name: "HR" },
];

function titleCaseSlug(slug) {
  return slug
    .split("_")
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(" ");
}

export default function LiveBoardRulesPage() {
  const pushToast = useToastStore((s) => s.pushToast);
  const { askConfirm } = useConfirmStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingClose, setSavingClose] = useState(false);
  const [runningClose, setRunningClose] = useState(false);
  const [rules, setRules] = useState(DEFAULT_LIVEBOARD_RULES);
  const [closeTime, setCloseTime] = useState("23:59");
  const [carryoverRoles, setCarryoverRoles] = useState(DEFAULT_CARRYOVER_ROLES);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [currentRules, closeSettings, roleRows] = await Promise.all([
          getLiveboardRules(),
          getLiveboardCloseSettings(),
          getRoles(),
        ]);
        if (cancelled) return;
        setRules(currentRules ?? DEFAULT_LIVEBOARD_RULES);
        setCloseTime(closeSettings?.liveboard_close_time ?? "23:59");
        setCarryoverRoles(
          closeSettings?.liveboard_carryover_visible_to_roles ??
            DEFAULT_CARRYOVER_ROLES,
        );
        setRoles(Array.isArray(roleRows) ? roleRows : []);
      } catch (error) {
        if (cancelled) return;
        pushToast({
          message: resolveApiError(error, "Failed to load LiveBoard settings."),
          severity: "error",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pushToast]);

  const visibleRoles = useMemo(() => {
    const dynamic = roles
      .filter((r) => r?.slug && r.slug !== "developer")
      .map((r) => ({ slug: r.slug, name: r.name || titleCaseSlug(r.slug) }));
    const merged = [...dynamic];
    ROLE_FALLBACK.forEach((f) => {
      if (!merged.some((x) => x.slug === f.slug)) merged.push(f);
    });
    return merged;
  }, [roles]);

  const toggleRole = (buttonKey, roleSlug) => {
    setRules((prev) => ({
      ...prev,
      [buttonKey]: {
        ...(prev[buttonKey] ?? {}),
        [roleSlug]: !(prev?.[buttonKey]?.[roleSlug] ?? false),
      },
    }));
  };

  const toggleCarryoverRole = (roleSlug) => {
    setCarryoverRoles((prev) =>
      prev.includes(roleSlug)
        ? prev.filter((s) => s !== roleSlug)
        : [...prev, roleSlug],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const next = await updateLiveboardRules(rules);
      setRules(next ?? {});
      pushToast({ message: "LiveBoard rules saved.", severity: "success" });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to save LiveBoard rules."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCloseSettings = async () => {
    setSavingClose(true);
    try {
      const next = await updateLiveboardCloseSettings({
        liveboard_close_time: closeTime,
        liveboard_carryover_visible_to_roles: carryoverRoles,
      });
      setCloseTime(next?.liveboard_close_time ?? closeTime);
      setCarryoverRoles(
        next?.liveboard_carryover_visible_to_roles ?? carryoverRoles,
      );
      pushToast({
        message: "Live Board close settings saved.",
        severity: "success",
      });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to save close settings."),
        severity: "error",
      });
    } finally {
      setSavingClose(false);
    }
  };

  const handleRunCloseNow = async () => {
    const closingDate = dayjs().subtract(1, "day").format("YYYY-MM-DD");
    const ok = await askConfirm({
      title: "Run overnight close now?",
      message: `This will process open visits from ${dayjs(closingDate).format("DD-MM-YYYY")}. Already-completed runs for that date are skipped.`,
      confirmLabel: "Run close",
    });
    if (!ok) return;

    setRunningClose(true);
    try {
      const result = await runLiveboardCloseDay(closingDate);
      const summary = result?.summary ?? {};
      const cancelledCount = Object.values(summary.cancelled_by_reason ?? {}).reduce(
        (a, b) => a + b,
        0,
      );
      const heldCount = Object.values(summary.held_by_status ?? {}).reduce(
        (a, b) => a + b,
        0,
      );
      pushToast({
        message: `Close complete: ${cancelledCount} cancelled, ${heldCount} held.`,
        severity: "success",
      });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to run overnight close."),
        severity: "error",
      });
    } finally {
      setRunningClose(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
        <LoadingIndicator size={112} />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 0.5 }}>
        LiveBoard Rules
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Configure which roles can see and use each LiveBoard action button.
        Developer role is hidden and always allowed.
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        `Assigned user` is controlled by business assignment logic per button.
      </Alert>
      <Stack spacing={1.5}>
        {BUTTON_RULES.map((item) => (
          <Card key={item.key} variant="outlined">
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {item.label}
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1.25}>
                {visibleRoles.map((role) => (
                  <FormControlLabel
                    key={`${item.key}-${role.slug}`}
                    control={
                      <Checkbox
                        checked={Boolean(rules?.[item.key]?.[role.slug])}
                        onChange={() => toggleRole(item.key, role.slug)}
                      />
                    }
                    label={ROLE_LABEL_OVERRIDES[role.slug] || role.name}
                  />
                ))}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(rules?.[item.key]?.assigned_user)}
                      onChange={() => toggleRole(item.key, "assigned_user")}
                    />
                  }
                  label="Assigned user"
                />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
      <Button
        variant="contained"
        startIcon={<SaveIcon />}
        sx={{ mt: 2 }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? "Saving..." : "Save rules"}
      </Button>

      <Typography variant="h6" sx={{ mt: 4, mb: 0.5 }}>
        Live Board Close
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Nightly close holds all open board visits (waiting through payment) for
        the carryover strip until staff finish or cancel them.
      </Typography>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack spacing={2}>
            <TextField
              label="Close time (HH:mm)"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
              inputProps={{ pattern: "[0-9]{2}:[0-9]{2}" }}
              helperText="When the nightly close job runs (clinic local time)."
              sx={{ maxWidth: 200 }}
            />
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Carryover strip visible to roles
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1.25}>
                {visibleRoles.map((role) => (
                  <FormControlLabel
                    key={`carryover-${role.slug}`}
                    control={
                      <Checkbox
                        checked={carryoverRoles.includes(role.slug)}
                        onChange={() => toggleCarryoverRole(role.slug)}
                      />
                    }
                    label={ROLE_LABEL_OVERRIDES[role.slug] || role.name}
                  />
                ))}
              </Stack>
            </Box>
            <Stack direction="row" gap={1.5} flexWrap="wrap">
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveCloseSettings}
                disabled={savingClose}
              >
                {savingClose ? "Saving..." : "Save close settings"}
              </Button>
              <Button
                variant="outlined"
                startIcon={<PlayArrowIcon />}
                onClick={handleRunCloseNow}
                disabled={runningClose}
              >
                {runningClose ? "Running..." : "Run close now (yesterday)"}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
