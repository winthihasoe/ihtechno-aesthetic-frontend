import { createElement, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  TextField,
  MenuItem,
  Divider,
  Tabs,
  Tab,
  Checkbox,
  FormGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import LoadingIndicator from "../components/common/LoadingIndicator";
import ClinicLogo from "../components/common/ClinicLogo";
import UploadIcon from "@mui/icons-material/Upload";
import SaveIcon from "@mui/icons-material/Save";
import RestoreIcon from "@mui/icons-material/Restore";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ViewKanbanIcon from "@mui/icons-material/ViewKanban";
import PeopleIcon from "@mui/icons-material/People";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import AccountBalanceOutlinedIcon from "@mui/icons-material/AccountBalanceOutlined";
import LocalHospitalOutlinedIcon from "@mui/icons-material/LocalHospitalOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import useSettingsStore, {
  DEFAULT_BRAND_COLORS,
} from "../stores/settingsStore";
import useThemeModeStore from "../stores/themeModeStore";
import useConfirmStore from "../stores/confirmStore";
import useToastStore from "../stores/toastStore";
import { resolveApiError } from "../services/apiClient";
import { formatFeeInput } from "../utils/formatFeeInput";
import { getAssignableRoleOptions } from "../services/settingsService";
import { deriveSurfaceAccentPair } from "../theme/colorDerivation";
import { hasStrictRole } from "../utils/workspaceRoutes";
import {
  DEFAULT_LOGO_URL,
  getClinicDisplayName,
} from "../utils/clinicBranding";

const TAB_IDS = ["general", "operation", "inventory", "financial"];
const DEFAULT_TAB = "general";

function SectionCard({ children, sx = {} }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 3,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
        overflow: "hidden",
        boxShadow: isDark ? "none" : "0 1px 2px rgba(15, 23, 42, 0.06)",
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}

function LabeledField({ id, label, children }) {
  return (
    <Stack spacing={0.75}>
      <Typography
        component="label"
        htmlFor={id}
        variant="body2"
        sx={{ fontWeight: 600, color: "text.primary" }}
      >
        {label}
      </Typography>
      {children}
    </Stack>
  );
}

function SectionHeader({ icon, title, description }) {
  return (
    <Box
      sx={{
        px: { xs: 2.5, sm: 3, md: 4 },
        py: { xs: 2.5, md: 3 },
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: (t) =>
          t.palette.mode === "dark"
            ? alpha(t.palette.common.white, 0.02)
            : alpha(t.palette.primary.main, 0.04),
      }}
    >
      <Stack
        direction="row"
        spacing={{ xs: 2, md: 2.5 }}
        alignItems="flex-start"
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
            color: "primary.main",
            flexShrink: 0,
          }}
        >
          {createElement(icon, { sx: { fontSize: 22 } })}
        </Box>
        <Box sx={{ minWidth: 0, pt: 0.25 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
            {title}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ lineHeight: 1.55 }}
          >
            {description}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

function SidebarPreview({ accentHex, pageBackgroundHex, clinicLabel }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const accent = isDark
    ? deriveSurfaceAccentPair(accentHex)
    : { bg: accentHex, fg: theme.palette.text.primary };
  const sidebarBg = isDark
    ? theme.palette.background.default
    : pageBackgroundHex || theme.palette.grey[100];
  const borderCol = theme.palette.divider;
  const muted = theme.palette.text.secondary;
  const inactiveIcon = isDark
    ? alpha(theme.palette.common.white, 0.45)
    : theme.palette.grey[500];
  const inactiveText = muted;

  const items = [
    { label: "Dashboard", icon: DashboardIcon, active: false },
    { label: "Live Board", icon: ViewKanbanIcon, active: true },
    { label: "Patients", icon: PeopleIcon, active: false },
  ];

  return (
    <Box
      sx={{
        width: { xs: "100%", sm: 168 },
        maxWidth: 220,
        bgcolor: sidebarBg,
        borderRadius: 2.5,
        p: 1.75,
        flexShrink: 0,
        border: 1,
        borderColor: borderCol,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 1.75,
          px: 0.5,
        }}
      >
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: 1.5,
            bgcolor: accent.bg,
            flexShrink: 0,
          }}
        />
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 700,
            color: "text.primary",
            letterSpacing: "-0.01em",
          }}
        >
          {clinicLabel}
        </Typography>
      </Box>
      <Stack spacing={0.5}>
        {items.map((item) => (
          <Box
            key={item.label}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1,
              py: 0.65,
              borderRadius: 1.5,
              bgcolor: item.active ? accent.bg : "transparent",
            }}
          >
            {createElement(item.icon, {
              sx: {
                fontSize: 14,
                color: item.active ? accent.fg : inactiveIcon,
              },
            })}
            <Typography
              sx={{
                fontSize: 10,
                fontWeight: item.active ? 600 : 500,
                color: item.active ? accent.fg : inactiveText,
              }}
            >
              {item.label}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

function ColorTokenField({ fieldId, label, hint, value, onChange }) {
  const theme = useTheme();
  const raw = (value || "").trim();
  const validHex = /^#[0-9A-Fa-f]{6}$/.test(raw);
  const pickerValue = validHex ? raw : "#000000";
  const swatchInputId = `color-swatch-${fieldId}`;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: { xs: 2, md: 2.5 },
        p: { xs: 2, md: 2.5, lg: 3 },
        borderRadius: 2.5,
        border: 1,
        borderColor: "divider",
        bgcolor: (t) =>
          t.palette.mode === "dark"
            ? alpha(t.palette.common.white, 0.035)
            : alpha(t.palette.grey[900], 0.04),
        transition: (t) =>
          t.transitions.create(["border-color", "box-shadow"], {
            duration: 180,
          }),
        "&:focus-within": {
          borderColor: "primary.main",
          boxShadow: (t) => `0 0 0 3px ${alpha(t.palette.primary.main, 0.18)}`,
        },
      }}
    >
      <Box
        component="label"
        htmlFor={swatchInputId}
        sx={{
          position: "relative",
          width: 52,
          height: 52,
          flexShrink: 0,
          borderRadius: 2,
          overflow: "hidden",
          cursor: "pointer",
          border: 1,
          borderColor: "divider",
          boxShadow: (t) =>
            `inset 0 0 0 1px ${alpha(t.palette.common.black, t.palette.mode === "dark" ? 0.35 : 0.08)}`,
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            bgcolor: validHex ? raw : alpha(theme.palette.grey[500], 0.35),
          }}
        />
        <input
          id={swatchInputId}
          type="color"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          style={{
            position: "absolute",
            opacity: 0,
            width: "100%",
            height: "100%",
            cursor: "pointer",
          }}
        />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            color: "text.primary",
            letterSpacing: "-0.01em",
          }}
        >
          {label}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 0.25, mb: 1, lineHeight: 1.5 }}
        >
          {hint}
        </Typography>
        <TextField
          fullWidth
          size="small"
          placeholder="#7C3AED"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          error={raw.length > 0 && !validHex}
          helperText={
            raw.length > 0 && !validHex
              ? "Use format #RRGGBB (six hex digits)"
              : undefined
          }
          FormHelperTextProps={{ sx: { mx: 0, mt: 0.5 } }}
          inputProps={{
            "aria-label": `${label} hex value`,
            spellCheck: false,
            style: {
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            },
          }}
        />
      </Box>
    </Box>
  );
}

export default function SettingsPage() {
  const theme = useTheme();
  const { user } = useAuthStore();
  const { settings, saveSettings, saveInvoiceNextNumber } = useSettingsStore();
  const themeMode = useThemeModeStore((s) => s.themeMode);
  const { askConfirm } = useConfirmStore();
  const { pushToast } = useToastStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const tab = TAB_IDS.includes(tabFromUrl) ? tabFromUrl : DEFAULT_TAB;
  const handleTabChange = (_, next) => {
    if (!TAB_IDS.includes(next)) return;
    const params = new URLSearchParams(searchParams);
    if (next === DEFAULT_TAB) {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    setSearchParams(params, { replace: true });
  };

  const [form, setForm] = useState({
    ...DEFAULT_BRAND_COLORS,
    clinic_name: "",
    clinic_description: "",
    clinic_address: "",
    clinic_phones_text: "",
    clinic_emails_text: "",
    clinic_website: "",
    appointment_hours_start: "09:00",
    appointment_hours_end: "18:00",
    default_consultation_fee: "25000",
    hr_default_grace_minutes: "5",
    hr_default_shift_start: "09:00",
    hr_default_shift_end: "18:00",
    hr_absence_penalty_multiplier: "3",
    hr_daily_salary_divisor: "30",
    hr_default_annual_leave_days: "12",
    hr_default_sick_leave_days: "8",
    vat_enabled: false,
    default_vat_percent: "0",
    assign_doctor_roles: [],
    inventory_fifo_ownership_preference: "purchased",
  });
  const [roleOptions, setRoleOptions] = useState([]);
  const [roleOptionsLoading, setRoleOptionsLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoiceNextDraft, setInvoiceNextDraft] = useState("1");
  const [savingInvoiceSetting, setSavingInvoiceSetting] = useState(false);

  useEffect(() => {
    setForm({
      primary_color: settings.primary_color,
      secondary_color: settings.secondary_color,
      background_color: settings.background_color,
      sidebar_accent_color:
        settings.sidebar_accent_color ||
        DEFAULT_BRAND_COLORS.sidebar_accent_color,
      clinic_name: settings.clinic_name ?? "",
      clinic_description: settings.clinic_description ?? "",
      clinic_address: settings.clinic_address ?? "",
      clinic_phones_text: (settings.clinic_phones || []).join("\n"),
      clinic_emails_text: (settings.clinic_emails || []).join("\n"),
      clinic_website: settings.clinic_website ?? "",
      appointment_hours_start: settings.appointment_hours_start ?? "09:00",
      appointment_hours_end: settings.appointment_hours_end ?? "18:00",
      default_consultation_fee: formatFeeInput(settings.default_consultation_fee ?? 25000),
      hr_default_grace_minutes: String(settings.hr_default_grace_minutes ?? 5),
      hr_default_shift_start: settings.hr_default_shift_start ?? "09:00",
      hr_default_shift_end: settings.hr_default_shift_end ?? "18:00",
      hr_absence_penalty_multiplier: String(settings.hr_absence_penalty_multiplier ?? 3),
      hr_daily_salary_divisor: String(settings.hr_daily_salary_divisor ?? 30),
      hr_default_annual_leave_days: String(settings.hr_default_annual_leave_days ?? 12),
      hr_default_sick_leave_days: String(settings.hr_default_sick_leave_days ?? 8),
      vat_enabled: Boolean(settings.vat_enabled),
      default_vat_percent:
        settings.default_vat_percent != null
          ? String(settings.default_vat_percent)
          : "0",
      assign_doctor_roles: Array.isArray(settings.assign_doctor_roles)
        ? settings.assign_doctor_roles
        : [],
      inventory_fifo_ownership_preference:
        settings.inventory_fifo_ownership_preference === "consignment"
          ? "consignment"
          : "purchased",
      inventory_material_cost_basis:
        settings.inventory_material_cost_basis === "latest_batch"
          ? "latest_batch"
          : settings.inventory_material_cost_basis === "last_purchase"
            ? "last_purchase"
            : "weighted_average",
    });
  }, [settings]);

  useEffect(() => {
    const nextNumber = settings?.invoice_next_number;
    if (nextNumber != null && nextNumber !== "") {
      setInvoiceNextDraft(String(nextNumber));
    }
  }, [settings?.invoice_next_number]);

  useEffect(() => {
    setRoleOptionsLoading(true);
    getAssignableRoleOptions()
      .then((rows) => setRoleOptions(Array.isArray(rows) ? rows : []))
      .catch(() => setRoleOptions([]))
      .finally(() => setRoleOptionsLoading(false));
  }, []);

  const canEditAppointmentHours = useMemo(
    () =>
      Boolean(
        user && (hasStrictRole(user, "owner") || hasStrictRole(user, "admin")),
      ),
    [user],
  );

  const logoPreview = useMemo(() => {
    if (logoFile) return URL.createObjectURL(logoFile);
    if (removeLogo) return null;
    return settings.logo_url || DEFAULT_LOGO_URL;
  }, [logoFile, removeLogo, settings.logo_url]);

  const handleSave = async () => {
    const approved = await askConfirm({
      title: "Save settings",
      message:
        "Apply clinic details, logo, and brand color changes now? These apply to everyone.",
      confirmText: "Save",
    });
    if (!approved) return;

    const phonesList = form.clinic_phones_text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const emailsList = form.clinic_emails_text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      const payload = {
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        background_color: form.background_color,
        sidebar_accent_color: form.sidebar_accent_color,
        clinic_name: form.clinic_name,
        clinic_description: form.clinic_description,
        clinic_address: form.clinic_address,
        clinic_website: form.clinic_website,
        clinic_phones: JSON.stringify(phonesList),
        clinic_emails: JSON.stringify(emailsList),
        logo: logoFile,
        remove_logo: removeLogo,
      };
      if (canEditAppointmentHours) {
        payload.appointment_hours_start = form.appointment_hours_start;
        payload.appointment_hours_end = form.appointment_hours_end;
        payload.default_consultation_fee = form.default_consultation_fee;
        payload.hr_default_grace_minutes = form.hr_default_grace_minutes;
        payload.hr_default_shift_start = form.hr_default_shift_start;
        payload.hr_default_shift_end = form.hr_default_shift_end;
        payload.hr_absence_penalty_multiplier = form.hr_absence_penalty_multiplier;
        payload.hr_daily_salary_divisor = form.hr_daily_salary_divisor;
        payload.hr_default_annual_leave_days = form.hr_default_annual_leave_days;
        payload.hr_default_sick_leave_days = form.hr_default_sick_leave_days;
      }
      payload.vat_enabled = form.vat_enabled;
      payload.default_vat_percent = form.default_vat_percent;
      if (canEditAppointmentHours) {
        payload.assign_doctor_roles = JSON.stringify(
          form.assign_doctor_roles ?? [],
        );
      }
      payload.inventory_fifo_ownership_preference =
        form.inventory_fifo_ownership_preference ?? "purchased";
      payload.inventory_material_cost_basis =
        form.inventory_material_cost_basis ?? "weighted_average";
      await saveSettings(payload);
      setLogoFile(null);
      setRemoveLogo(false);
      pushToast({
        message: "Settings updated successfully.",
        severity: "success",
      });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to update settings."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const brandColorsAreDefault = useMemo(() => {
    const norm = (c) => (typeof c === "string" ? c.trim().toLowerCase() : "");
    const sidebarEffective =
      (typeof settings.sidebar_accent_color === "string" &&
        settings.sidebar_accent_color.trim()) ||
      DEFAULT_BRAND_COLORS.sidebar_accent_color;
    return (
      norm(settings.primary_color) ===
        norm(DEFAULT_BRAND_COLORS.primary_color) &&
      norm(settings.secondary_color) ===
        norm(DEFAULT_BRAND_COLORS.secondary_color) &&
      norm(settings.background_color) ===
        norm(DEFAULT_BRAND_COLORS.background_color) &&
      norm(sidebarEffective) === norm(DEFAULT_BRAND_COLORS.sidebar_accent_color)
    );
  }, [
    settings.primary_color,
    settings.secondary_color,
    settings.background_color,
    settings.sidebar_accent_color,
  ]);

  const handleResetBrandColors = async () => {
    const approved = await askConfirm({
      title: "Reset brand colors",
      message:
        "Revert primary, secondary, page background, and sidebar accent colors to the product defaults? This saves immediately and applies to everyone.",
      confirmText: "Reset colors",
    });
    if (!approved) return;

    const phonesList = (settings.clinic_phones || []).filter(Boolean);
    const emailsList = (settings.clinic_emails || []).filter(Boolean);

    setSaving(true);
    try {
      const payload = {
        ...DEFAULT_BRAND_COLORS,
        clinic_name: settings.clinic_name ?? "",
        clinic_description: settings.clinic_description ?? "",
        clinic_address: settings.clinic_address ?? "",
        clinic_website: settings.clinic_website ?? "",
        clinic_phones: JSON.stringify(phonesList),
        clinic_emails: JSON.stringify(emailsList),
        remove_logo: false,
      };
      if (canEditAppointmentHours) {
        payload.appointment_hours_start =
          settings.appointment_hours_start ?? "09:00";
        payload.appointment_hours_end =
          settings.appointment_hours_end ?? "18:00";
        payload.hr_default_grace_minutes =
          settings.hr_default_grace_minutes ?? 5;
        payload.hr_default_shift_start =
          settings.hr_default_shift_start ?? "09:00";
        payload.hr_default_shift_end = settings.hr_default_shift_end ?? "18:00";
      }
      await saveSettings(payload);
      pushToast({
        message: "Brand colors reset to defaults.",
        severity: "success",
      });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to reset brand colors."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInvoiceNext = async () => {
    const nextNumber = parseInt(invoiceNextDraft, 10);
    if (!Number.isFinite(nextNumber) || nextNumber < 1) {
      pushToast({
        message: "Next invoice number must be at least 1.",
        severity: "warning",
      });
      return;
    }
    try {
      setSavingInvoiceSetting(true);
      await saveInvoiceNextNumber(nextNumber);
      pushToast({
        message: "Next invoice number saved.",
        severity: "success",
      });
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not save invoice setting."),
        severity: "error",
      });
    } finally {
      setSavingInvoiceSetting(false);
    }
  };

  const colorFields = [
    {
      key: "primary_color",
      label: "Primary",
      hint: "Buttons, links, focus rings",
    },
    {
      key: "secondary_color",
      label: "Secondary",
      hint: "Secondary actions and highlights",
    },
    {
      key: "background_color",
      label: "Page background",
      hint: "Main canvas behind content (light mode)",
    },
    {
      key: "sidebar_accent_color",
      label: "Sidebar accent",
      hint: "Active item and avatar accents",
    },
  ];

  return (
    <Box sx={{ pb: 2 }}>
      <Box sx={{ mb: { xs: 3.5, md: 4 } }}>
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            letterSpacing: "-0.02em",
            mb: { xs: 1, md: 1.25 },
          }}
        >
          Settings
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: { xs: 560, md: 640, lg: 1280 }, lineHeight: 1.65 }}
        >
          Clinic profile, branding, and colors apply to everyone. Light or dark
          mode can be changed anytime from the app bar and stays personal to
          this browser.
        </Typography>
      </Box>

      <Box
        sx={{
          mb: { xs: 2.5, md: 3 },
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Tabs
          value={tab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 44,
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 600,
              color: "text.secondary",
            },
            "& .MuiTab-root.Mui-selected": {
              color: "white",
            },
          }}
        >
          <Tab value="general" label="General" />
          <Tab value="operation" label="Operation" />
          <Tab value="inventory" label="Inventory" />
          <Tab value="financial" label="Billing Defaults" />
        </Tabs>
      </Box>

      <Stack spacing={{ xs: 2.5, md: 3.5, lg: 4 }}>
        {tab === "general" && (
          <SectionCard>
            <SectionHeader
              icon={ImageOutlinedIcon}
              title="Clinic logo"
              description="Shown in the sidebar and sign-in experience. PNG, JPG, or Webp, up to 2 MB."
            />
            <Box sx={{ px: { xs: 2.5, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={{ xs: 3, md: 4 }}
                alignItems={{ sm: "center" }}
              >
                <Box
                  sx={{
                    width: 88,
                    height: 88,
                    borderRadius: 3,
                    border: 2,
                    borderStyle: logoPreview ? "solid" : "dashed",
                    borderColor: logoPreview
                      ? "divider"
                      : alpha(theme.palette.text.secondary, 0.35),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: alpha(theme.palette.action.hover, 0.5),
                    overflow: "hidden",
                    flexShrink: 0,
                  }}
                >
                  {logoPreview ? (
                    <ClinicLogo
                      src={logoPreview}
                      alt="Logo preview"
                      sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <ImageOutlinedIcon
                      sx={{ fontSize: 32, color: "text.disabled" }}
                    />
                  )}
                </Box>
                <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Button
                      component="label"
                      variant="contained"
                      startIcon={<UploadIcon />}
                      sx={{ textTransform: "none", fontWeight: 600 }}
                    >
                      Upload logo
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        hidden
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setLogoFile(file);
                          setRemoveLogo(false);
                        }}
                      />
                    </Button>
                    <Button
                      variant="outlined"
                      color="inherit"
                      startIcon={<RestoreIcon />}
                      onClick={() => {
                        setLogoFile(null);
                        setRemoveLogo(true);
                      }}
                      sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        borderColor: "divider",
                        color: "text.secondary",
                      }}
                    >
                      Remove
                    </Button>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    Saving applies logo together with clinic details and theme
                    colors below.
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          </SectionCard>
        )}

        {tab === "general" && (
          <SectionCard>
            <SectionHeader
              icon={BusinessOutlinedIcon}
              title="Clinic profile"
              description="Used for letterhead, PDFs, and public-facing details. Phone numbers and emails: one per line."
            />
            <Box sx={{ px: { xs: 2.5, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "repeat(2, minmax(0, 1fr))",
                  },
                  gap: { xs: 2.5, md: 3 },
                }}
              >
                <LabeledField id="settings-clinic-name" label="Clinic name">
                  <TextField
                    id="settings-clinic-name"
                    value={form.clinic_name}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        clinic_name: e.target.value,
                      }))
                    }
                    fullWidth
                    hiddenLabel
                  />
                </LabeledField>
                <LabeledField
                  id="settings-clinic-description"
                  label="Description"
                >
                  <TextField
                    id="settings-clinic-description"
                    value={form.clinic_description}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        clinic_description: e.target.value,
                      }))
                    }
                    fullWidth
                    multiline
                    minRows={2}
                    hiddenLabel
                  />
                </LabeledField>
                <LabeledField id="settings-clinic-address" label="Address">
                  <TextField
                    id="settings-clinic-address"
                    value={form.clinic_address}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        clinic_address: e.target.value,
                      }))
                    }
                    fullWidth
                    multiline
                    minRows={3}
                    hiddenLabel
                  />
                </LabeledField>
                <LabeledField
                  id="settings-clinic-phones"
                  label="Phone numbers"
                >
                  <TextField
                    id="settings-clinic-phones"
                    value={form.clinic_phones_text}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        clinic_phones_text: e.target.value,
                      }))
                    }
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="One number per line"
                    hiddenLabel
                  />
                </LabeledField>
                <LabeledField
                  id="settings-clinic-emails"
                  label="Email addresses"
                >
                  <TextField
                    id="settings-clinic-emails"
                    value={form.clinic_emails_text}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        clinic_emails_text: e.target.value,
                      }))
                    }
                    fullWidth
                    multiline
                    minRows={2}
                    placeholder="One email per line"
                    hiddenLabel
                  />
                </LabeledField>
                <LabeledField id="settings-clinic-website" label="Website">
                  <TextField
                    id="settings-clinic-website"
                    value={form.clinic_website}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        clinic_website: e.target.value,
                      }))
                    }
                    fullWidth
                    placeholder="https://"
                    hiddenLabel
                  />
                </LabeledField>
              </Box>
            </Box>
          </SectionCard>
        )}

        {tab === "operation" && canEditAppointmentHours && (
          <>
            <SectionCard>
              <SectionHeader
                icon={EventAvailableOutlinedIcon}
                title="Appointment hours"
                description="Reception and other roles see this window when booking. End time is inclusive (e.g. 18:00 is allowed)."
              />
              <Box sx={{ px: { xs: 2.5, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
                <Stack spacing={2}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={2}
                    useFlexGap
                  >
                    <TextField
                      label="Available from"
                      type="time"
                      value={form.appointment_hours_start}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          appointment_hours_start: e.target.value,
                        }))
                      }
                      slotProps={{ inputLabel: { shrink: true } }}
                      fullWidth
                      inputProps={{ "aria-label": "Appointment day start time" }}
                    />
                    <TextField
                      label="Available until"
                      type="time"
                      value={form.appointment_hours_end}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          appointment_hours_end: e.target.value,
                        }))
                      }
                      slotProps={{ inputLabel: { shrink: true } }}
                      fullWidth
                      inputProps={{ "aria-label": "Appointment day end time" }}
                    />
                  </Stack>
                  <LabeledField
                    id="settings-default-consultation-fee"
                    label="Default consultation fee (MMK)"
                  >
                    <TextField
                      id="settings-default-consultation-fee"
                      type="number"
                      value={form.default_consultation_fee}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          default_consultation_fee: e.target.value,
                        }))
                      }
                      inputProps={{ min: 0, step: 1000 }}
                      fullWidth
                      hiddenLabel
                      placeholder="25000"
                    />
                  </LabeledField>
                </Stack>
              </Box>
            </SectionCard>

            <SectionCard>
              <SectionHeader
                icon={EventAvailableOutlinedIcon}
                title="Default Operation Start Hours"
                description="HR default schedule baseline for attendance calculations. CEO/owner can set the clinic grace minutes here; each staff can still override this in their weekly schedule."
              />
              <Box sx={{ px: { xs: 2.5, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  useFlexGap
                >
                  <TextField
                    label="HR default shift start"
                    type="time"
                    value={form.hr_default_shift_start}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        hr_default_shift_start: e.target.value,
                      }))
                    }
                    slotProps={{ inputLabel: { shrink: true } }}
                    fullWidth
                    inputProps={{ "aria-label": "HR default shift start time" }}
                  />
                  <TextField
                    label="HR default shift end"
                    type="time"
                    value={form.hr_default_shift_end}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        hr_default_shift_end: e.target.value,
                      }))
                    }
                    slotProps={{ inputLabel: { shrink: true } }}
                    fullWidth
                    inputProps={{ "aria-label": "HR default shift end time" }}
                  />
                  <TextField
                    label="Default grace minutes (clinic default: 5)"
                    type="number"
                    value={form.hr_default_grace_minutes}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        hr_default_grace_minutes: e.target.value,
                      }))
                    }
                    slotProps={{ inputLabel: { shrink: true } }}
                    fullWidth
                    inputProps={{
                      min: 0,
                      max: 180,
                      "aria-label": "Default HR grace minutes",
                    }}
                    helperText="Check-ins inside this window are allowed. If staff exceed grace, late policy counts the full minutes from shift start."
                  />
                </Stack>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  useFlexGap
                  sx={{ mt: 2 }}
                >
                  <TextField
                    label="Absence penalty multiplier"
                    type="number"
                    value={form.hr_absence_penalty_multiplier}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        hr_absence_penalty_multiplier: e.target.value,
                      }))
                    }
                    slotProps={{ inputLabel: { shrink: true } }}
                    fullWidth
                    helperText="Penalty per absent day = daily salary × this value"
                    inputProps={{
                      min: 0,
                      max: 99.99,
                      step: 0.01,
                      "aria-label": "Absence penalty multiplier",
                    }}
                  />
                  <TextField
                    label="Daily salary divisor"
                    type="number"
                    value={form.hr_daily_salary_divisor}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        hr_daily_salary_divisor: e.target.value,
                      }))
                    }
                    slotProps={{ inputLabel: { shrink: true } }}
                    fullWidth
                    helperText="Daily salary = base salary ÷ this value"
                    inputProps={{
                      min: 1,
                      max: 366,
                      "aria-label": "Daily salary divisor",
                    }}
                  />
                  <TextField
                    label="Default annual leave days"
                    type="number"
                    value={form.hr_default_annual_leave_days}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        hr_default_annual_leave_days: e.target.value,
                      }))
                    }
                    slotProps={{ inputLabel: { shrink: true } }}
                    fullWidth
                    inputProps={{
                      min: 0,
                      max: 366,
                      "aria-label": "Default annual leave days",
                    }}
                  />
                  <TextField
                    label="Default sick leave days"
                    type="number"
                    value={form.hr_default_sick_leave_days}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        hr_default_sick_leave_days: e.target.value,
                      }))
                    }
                    slotProps={{ inputLabel: { shrink: true } }}
                    fullWidth
                    inputProps={{
                      min: 0,
                      max: 366,
                      "aria-label": "Default sick leave days",
                    }}
                  />
                </Stack>
              </Box>
            </SectionCard>

            <SectionCard>
              <SectionHeader
                icon={LocalHospitalOutlinedIcon}
                title="Assign doctor list"
                description="Users with these roles appear in Live Board and appointment doctor pickers."
              />
              <Box sx={{ px: { xs: 2.5, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
                {roleOptionsLoading ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                    <LoadingIndicator size={22} />
                  </Box>
                ) : roleOptions.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No roles found.
                  </Typography>
                ) : (
                  <FormGroup
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(2, minmax(0, 1fr))",
                        md: "repeat(3, minmax(0, 1fr))",
                      },
                      columnGap: 2,
                      rowGap: 0.5,
                    }}
                  >
                    {roleOptions.map((role) => {
                      const checked = (form.assign_doctor_roles || []).includes(
                        role.slug,
                      );
                      return (
                        <FormControlLabel
                          key={role.slug}
                          control={
                            <Checkbox
                              checked={checked}
                              onChange={(e) => {
                                const next = new Set(
                                  form.assign_doctor_roles || [],
                                );
                                if (e.target.checked) {
                                  next.add(role.slug);
                                } else {
                                  next.delete(role.slug);
                                }
                                setForm((prev) => ({
                                  ...prev,
                                  assign_doctor_roles: Array.from(next),
                                }));
                              }}
                            />
                          }
                          label={
                            <Stack spacing={0}>
                              <Typography
                                variant="body2"
                                sx={{ fontWeight: 600, lineHeight: 1.3 }}
                              >
                                {role.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{
                                  fontFamily:
                                    "ui-monospace, SFMono-Regular, Menlo, monospace",
                                }}
                              >
                                {role.slug}
                              </Typography>
                            </Stack>
                          }
                          sx={{ alignItems: "flex-start", mr: 0, py: 0.25 }}
                        />
                      );
                    })}
                  </FormGroup>
                )}
              </Box>
            </SectionCard>
          </>
        )}

        {tab === "operation" && !canEditAppointmentHours && (
          <SectionCard>
            <Box sx={{ px: { xs: 2.5, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
              <Typography variant="body2" color="text.secondary">
                Only owners and administrators can manage operation settings.
              </Typography>
            </Box>
          </SectionCard>
        )}

        {tab === "inventory" && (
          <SectionCard>
            <SectionHeader
              icon={Inventory2OutlinedIcon}
              title="Treatment stock deduction"
              description="FIFO still applies inside each ownership group (nearest expiry first). The clinic uses this batch group first during treatments; remaining need is fulfilled from the other group automatically."
            />
            <Box sx={{ px: { xs: 2.5, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: { xs: 3, md: 4 },
                  alignItems: "start",
                }}
              >
                <FormControl component="fieldset" variant="standard" fullWidth>
                  <FormLabel component="legend" sx={{ fontWeight: 700, mb: 1 }}>
                    Use first for treatments
                  </FormLabel>
                  <RadioGroup
                    value={
                      form.inventory_fifo_ownership_preference ?? "purchased"
                    }
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        inventory_fifo_ownership_preference: e.target.value,
                      }))
                    }
                  >
                    <FormControlLabel
                      value="purchased"
                      control={<Radio />}
                      label="Purchased batches"
                    />
                    <FormControlLabel
                      value="consignment"
                      control={<Radio />}
                      label="Consignment batches"
                    />
                  </RadioGroup>
                </FormControl>
                <FormControl component="fieldset" variant="standard" fullWidth>
                  <FormLabel component="legend" sx={{ fontWeight: 700, mb: 1 }}>
                    Template / package material cost basis
                  </FormLabel>
                  <RadioGroup
                    value={form.inventory_material_cost_basis ?? "weighted_average"}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        inventory_material_cost_basis: e.target.value,
                      }))
                    }
                  >
                    <FormControlLabel
                      value="weighted_average"
                      control={<Radio />}
                      label="Weighted average (on-hand batches)"
                    />
                    <FormControlLabel
                      value="latest_batch"
                      control={<Radio />}
                      label="Latest batch cost"
                    />
                    <FormControlLabel
                      value="last_purchase"
                      control={<Radio />}
                      label="Last purchase cost"
                    />
                  </RadioGroup>
                </FormControl>
              </Box>
            </Box>
          </SectionCard>
        )}

        {tab === "financial" && (
          <>
            <SectionCard>
              <SectionHeader
                icon={AccountBalanceOutlinedIcon}
                title="Billing defaults"
                description="Invoice numbering and optional tax defaults apply to new invoices when line tax is not set on the line."
              />
              <Box sx={{ px: { xs: 2.5, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
                <Stack spacing={2}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.25}
                    alignItems={{ xs: "stretch", sm: "center" }}
                    sx={{
                      p: 1.5,
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 2,
                      bgcolor: (t) =>
                        t.palette.mode === "dark"
                          ? alpha(t.palette.common.white, 0.03)
                          : alpha(t.palette.common.black, 0.02),
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Invoice numbering
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Next paid invoice will use this sequence (INV-000001
                        format).
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ whiteSpace: "nowrap" }}
                      >
                        Next #
                      </Typography>
                      <TextField
                        size="small"
                        type="number"
                        inputProps={{ min: 1 }}
                        value={invoiceNextDraft}
                        onChange={(e) => setInvoiceNextDraft(e.target.value)}
                        sx={{ width: 130 }}
                      />
                      <Button
                        variant="contained"
                        onClick={handleSaveInvoiceNext}
                        disabled={savingInvoiceSetting}
                      >
                        {savingInvoiceSetting ? "Saving..." : "Save"}
                      </Button>
                    </Stack>
                  </Stack>
                  <Stack direction={"row"} spacing={1}>
                    <Stack width={"100%"}>
                      <Typography
                        color="text.secondary"
                        fontWeight={600}
                        variant="body2"
                      >
                        Tax on invoices
                      </Typography>
                      <TextField
                        select
                        fullWidth
                        value={form.vat_enabled ? "on" : "off"}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            vat_enabled: e.target.value === "on",
                          }))
                        }
                      >
                        <MenuItem value="off">Off</MenuItem>
                        <MenuItem value="on">
                          On (use default % when line tax is 0)
                        </MenuItem>
                      </TextField>
                    </Stack>
                    <Stack width={"100%"}>
                      <Typography
                        color="text.secondary"
                        fontWeight={600}
                        variant="body2"
                      >
                        Default Tax %
                      </Typography>
                      <TextField
                        type="number"
                        fullWidth
                        value={form.default_vat_percent}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            default_vat_percent: e.target.value,
                          }))
                        }
                        inputProps={{ min: 0, max: 100, step: "0.01" }}
                      />
                    </Stack>
                  </Stack>
                </Stack>
              </Box>
            </SectionCard>
          </>
        )}

        {tab === "general" && (
          <SectionCard>
            <SectionHeader
              icon={PaletteOutlinedIcon}
              title="Brand colors"
              description="These drive light mode and seed accent colors in dark mode. Changes apply to all users after you save."
            />
            <Box sx={{ px: { xs: 2.5, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.5,
                  mb: { xs: 2, md: 2.5 },
                }}
              >
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{
                    display: "block",
                    letterSpacing: "0.08em",
                    fontWeight: 600,
                  }}
                >
                  Color tokens
                </Typography>
                <Button
                  type="button"
                  variant="outlined"
                  size="small"
                  startIcon={<RestoreIcon />}
                  onClick={handleResetBrandColors}
                  disabled={saving || brandColorsAreDefault}
                >
                  Reset to default colors
                </Button>
              </Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    md: "minmax(0, 1fr) minmax(240px, 300px)",
                    lg: "minmax(0, 1fr) minmax(260px, 320px)",
                  },
                  columnGap: { md: 3.5, lg: 5 },
                  rowGap: { xs: 3, md: 0 },
                  alignItems: "start",
                }}
              >
                <Box sx={{ minWidth: 0, width: "100%" }}>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        sm: "repeat(auto-fill, minmax(min(100%, 300px), 1fr))",
                      },
                      gap: { xs: 2, sm: 2.5, md: 3 },
                    }}
                  >
                    {colorFields.map((field) => (
                      <ColorTokenField
                        key={field.key}
                        fieldId={field.key}
                        label={field.label}
                        hint={field.hint}
                        value={form[field.key]}
                        onChange={(next) =>
                          setForm((prev) => ({
                            ...prev,
                            [field.key]: next,
                          }))
                        }
                      />
                    ))}
                  </Box>
                </Box>

                <Box
                  sx={{
                    width: "100%",
                    minWidth: 0,
                    p: { xs: 0, md: 2.5, lg: 3 },
                    borderRadius: 2.5,
                    border: { xs: 0, md: 1 },
                    borderColor: "divider",
                    bgcolor: (t) =>
                      t.palette.mode === "dark"
                        ? alpha(t.palette.common.white, 0.02)
                        : alpha(t.palette.grey[500], 0.06),
                  }}
                >
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{
                      mb: { xs: 1.5, md: 2 },
                      display: "block",
                      letterSpacing: "0.08em",
                      fontWeight: 600,
                    }}
                  >
                    Sidebar preview
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      display: "block",
                      mb: { xs: 2, md: 2.5 },
                      lineHeight: 1.5,
                    }}
                  >
                    Reflects your current display mode ({themeMode}) and accent
                    color.
                  </Typography>
                  <SidebarPreview
                    accentHex={
                      form.sidebar_accent_color ||
                      DEFAULT_BRAND_COLORS.sidebar_accent_color
                    }
                    pageBackgroundHex={form.background_color || undefined}
                    clinicLabel={getClinicDisplayName({
                      clinic_name: form.clinic_name,
                    })}
                  />
                </Box>
              </Box>
            </Box>
          </SectionCard>
        )}

        <SectionCard
          sx={{
            borderStyle: "dashed",
            borderColor: alpha(theme.palette.divider, 0.9),
          }}
        >
          <Box
            sx={{
              px: { xs: 2.5, sm: 3, md: 4 },
              py: { xs: 2.5, md: 3 },
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { sm: "center" },
              justifyContent: "space-between",
              gap: { xs: 2, md: 3 },
            }}
          >
            <Box>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                color="text.primary"
              >
                Save changes
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Clinic profile, logo, and brand colors are stored for the whole
                clinic.
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{
                px: 3,
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 999,
                flexShrink: 0,
              }}
            >
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </Box>
        </SectionCard>
      </Stack>
    </Box>
  );
}
