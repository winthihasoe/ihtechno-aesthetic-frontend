import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import HrPageShell from "./components/HrPageShell";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import {
  getLateAttendancePolicy,
  updateLateAttendancePolicy,
} from "../../services/hrService";

const defaultConfig = {
  is_enabled: true,
  preset: "standard_half_day_plus_minutes",
  daily_half_day_enabled: true,
  daily_half_day_after_minutes: 60,
  monthly_half_day_enabled: true,
  monthly_half_day_after_minutes: 60,
  monthly_half_day_cap: 1,
  minute_charge_enabled: true,
  workday_hours: 8,
};

const numberFields = new Set([
  "daily_half_day_after_minutes",
  "monthly_half_day_after_minutes",
  "monthly_half_day_cap",
  "workday_hours",
]);

export default function HrLateAttendancePolicyPage() {
  const { pushToast } = useToastStore();
  const [config, setConfig] = useState(defaultConfig);
  const [savedConfig, setSavedConfig] = useState(defaultConfig);
  const [presetOptions, setPresetOptions] = useState([]);
  const [instructions, setInstructions] = useState([]);
  const [defaultGraceMinutes, setDefaultGraceMinutes] = useState(5);
  const [dailySalaryDivisor, setDailySalaryDivisor] = useState(30);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const activePreset = useMemo(
    () => presetOptions.find((option) => option.value === config.preset),
    [config.preset, presetOptions],
  );
  const hasChanges = useMemo(
    () => JSON.stringify(config) !== JSON.stringify(savedConfig),
    [config, savedConfig],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getLateAttendancePolicy();
      const nextConfig = { ...defaultConfig, ...(res.config || {}) };
      setConfig(nextConfig);
      setSavedConfig(nextConfig);
      setPresetOptions(res.preset_options || []);
      setInstructions(res.instructions || []);
      setDefaultGraceMinutes(Number(res.default_grace_minutes ?? 5));
      setDailySalaryDivisor(Number(res.daily_salary_divisor ?? 30));
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to load late attendance policy."),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const updateField = (field) => (event) => {
    const value =
      event.target.type === "checkbox" ? event.target.checked : event.target.value;
    setConfig((prev) => ({
      ...prev,
      [field]: numberFields.has(field) ? Number(value) : value,
    }));
  };

  const save = async () => {
    if (!hasChanges) return;

    setSaving(true);
    try {
      const res = await updateLateAttendancePolicy(config);
      const nextConfig = { ...defaultConfig, ...(res.config || {}) };
      setConfig(nextConfig);
      setSavedConfig(nextConfig);
      setPresetOptions(res.preset_options || []);
      setInstructions(res.instructions || []);
      pushToast({ message: "Late attendance policy updated.", severity: "success" });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to save late attendance policy."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <HrPageShell
      title="HR Module"
      subtitle="Late attendance policy"
      badge={config.is_enabled ? "Active" : "Paused"}
      actions={
        <Button
          variant="contained"
          onClick={save}
          disabled={loading || saving || !hasChanges}
        >
          {saving ? "Saving..." : "Save Policy"}
        </Button>
      }
    >
      <Stack spacing={2}>
        <Alert severity="info">
          Default grace is {defaultGraceMinutes} minutes from Settings. Once a
          check-in exceeds grace, payroll counts the full minutes from shift start.
        </Alert>

        <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
              spacing={1}
            >
              <Box>
                <Typography variant="h6">Policy Instructions</Typography>
                <Typography variant="body2" color="text.secondary">
                  These rules are used when payroll is generated from approved
                  attendance logs.
                </Typography>
              </Box>
              <Chip label={`Salary divisor: ${dailySalaryDivisor} days`} />
            </Stack>
            <Divider />
            <Stack spacing={1}>
              {instructions.map((instruction) => (
                <Typography key={instruction} variant="body2">
                  {instruction}
                </Typography>
              ))}
            </Stack>
          </Stack>
        </Card>

        <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
              spacing={1.5}
            >
              <Box>
                <Typography variant="h6">Calculation Style</Typography>
                <Typography variant="body2" color="text.secondary">
                  HR can change the preset without writing a custom formula.
                </Typography>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(config.is_enabled)}
                    onChange={updateField("is_enabled")}
                  />
                }
                label={config.is_enabled ? "Enabled" : "Paused"}
              />
            </Stack>

            <TextField
              select
              label="Preset"
              value={config.preset}
              onChange={updateField("preset")}
              helperText={activePreset?.description || "Choose how late deductions are calculated."}
              fullWidth
            >
              {presetOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Daily half-day after"
                type="number"
                value={config.daily_half_day_after_minutes}
                onChange={updateField("daily_half_day_after_minutes")}
                helperText="Minutes late in one day before half-day deduction."
                fullWidth
                disabled={!config.daily_half_day_enabled}
              />
              <TextField
                label="Monthly half-day after"
                type="number"
                value={config.monthly_half_day_after_minutes}
                onChange={updateField("monthly_half_day_after_minutes")}
                helperText="Monthly late-minute pool before half-day deduction."
                fullWidth
                disabled={!config.monthly_half_day_enabled}
              />
              <TextField
                label="Work hours per day"
                type="number"
                value={config.workday_hours}
                onChange={updateField("workday_hours")}
                helperText="Used for salary-per-minute charge."
                fullWidth
                disabled={!config.minute_charge_enabled}
              />
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(config.daily_half_day_enabled)}
                    onChange={updateField("daily_half_day_enabled")}
                  />
                }
                label="Daily half-day deduction"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(config.monthly_half_day_enabled)}
                    onChange={updateField("monthly_half_day_enabled")}
                  />
                }
                label="Monthly half-day deduction"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(config.minute_charge_enabled)}
                    onChange={updateField("minute_charge_enabled")}
                  />
                }
                label="Minute charge"
              />
            </Stack>

            <TextField
              label="Monthly half-day cap"
              type="number"
              value={config.monthly_half_day_cap}
              onChange={updateField("monthly_half_day_cap")}
              helperText="Default is 1 half-day deduction from the monthly late-minute pool."
              sx={{ maxWidth: 360 }}
              disabled={!config.monthly_half_day_enabled}
            />
          </Stack>
        </Card>

        <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Typography variant="h6" gutterBottom>
            Default Example
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body2">
              Shift starts at 09:00. A check-in inside the grace window has no late
              deduction.
            </Typography>
            <Typography variant="body2">
              Check-in at 09:07 counts as 7 late minutes.
            </Typography>
            <Typography variant="body2">
              Check-in at 10:01 is more than 60 minutes late and deducts half day.
            </Typography>
            <Typography variant="body2">
              Remaining chargeable late minutes use: basic salary / 30 days / 8
              work hours / 60 minutes.
            </Typography>
          </Stack>
        </Card>
      </Stack>
    </HrPageShell>
  );
}
