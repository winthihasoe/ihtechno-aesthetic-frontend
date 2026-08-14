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
  CircularProgress,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Chip,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
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
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import useSettingsStore, {
  DEFAULT_BRAND_COLORS,
} from "../stores/settingsStore";
import useThemeModeStore from "../stores/themeModeStore";
import useConfirmStore from "../stores/confirmStore";
import useToastStore from "../stores/toastStore";
import { resolveApiError } from "../services/apiClient";
import { getBranches, listChartOfAccounts } from "../services/financeService";
import { getAssignableRoleOptions } from "../services/settingsService";
import {
  getTransactionMethods,
  createTransactionMethod,
  updateTransactionMethod,
  deleteTransactionMethod,
} from "../services/transactionMethodService";
import { deriveSurfaceAccentPair } from "../theme/colorDerivation";
import { hasStrictRole } from "../utils/workspaceRoutes";
import { getClinicDisplayName } from "../utils/clinicBranding";
import { VISIT_STATUS_CONFIG } from "../utils/visitStatuses";
import { DEFAULT_LIVEBOARD_RULES } from "../utils/roleUtils";
import ChartOfAccountPicker from "../components/finance/ChartOfAccountPicker";

const TAB_IDS = ["general", "operation", "inventory", "financial"];
const DEFAULT_TAB = "general";

const LEDGER_KIND_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "transfer", label: "Bank transfer" },
  { value: "e-wallet", label: "E-wallet" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

const TM_STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "expire", label: "Expire" },
];

const LIVEBOARD_ACTION_LABELS = {
  open_panel: "Open visit panel",
  start_consulting: "Start consultation",
  do_not_consulting: "Skip consultation",
  open_consulting: "Open consultation room",
  send_to_preparation: "Send to pre-treatment",
  proceed_treatment: "Proceed to treatment",
  start_treatment: "Start treatment session",
  mark_done: "Mark treatment done",
  go_to_invoice: "Go to invoice",
  handover_request: "Request handover",
  handover_accept: "Accept handover",
  doctor_handover_request: "Request doctor handover",
  doctor_handover_accept: "Accept doctor handover",
};

const OPERATION_DEVELOPER_TOPICS = [
  {
    topic: "Visit workflow stages",
    description:
      "Rename stages, change order, or add/remove steps such as lab or pharmacy routing.",
    example:
      "Waiting → In Consultation → Pre-treatment → Treatment → Billing → Completed",
  },
  {
    topic: "Visit History action buttons",
    description:
      "Control which roles can start consultation, send to pre-treatment, mark done, hand over, and more.",
    example: "Per-action role matrix (see table below)",
  },
  {
    topic: "Appointment booking rules",
    description:
      "Slot intervals, minimum lead time, same-day limits, or automatic holiday blocking.",
    example: "Currently limited to clinic operation hours",
  },
  {
    topic: "Check-in routing",
    description:
      "Where a visit lands after patient check-in (waiting queue vs direct to consultation).",
    example: "Post check-in destination dialog",
  },
  {
    topic: "HR leave & attendance defaults",
    description:
      "Default annual/sick leave entitlements, overtime rules, and approval thresholds.",
    example: "HR leave rules and public holidays modules",
  },
  {
    topic: "Role action permissions",
    description:
      "Which roles can create visits, open payments, or manage treatments outside Visit History.",
    example: "Role and permission matrix",
  },
];

const GENERAL_DEVELOPER_TOPICS = [
  {
    topic: "Login & sign-in screen",
    description:
      "Custom background, welcome copy, demo credentials visibility, or SSO login.",
    example: "Branded login page with clinic logo",
  },
  {
    topic: "PDF & print layouts",
    description:
      "Invoice, receipt, consent form, and letterhead templates with clinic-specific fields.",
    example: "Clinic profile fields feed PDF headers",
  },
  {
    topic: "Sidebar navigation",
    description:
      "Which modules appear, menu order, role-based visibility, and workspace labels.",
    example: "Role and permission driven navigation",
  },
  {
    topic: "Dark mode behavior",
    description:
      "How brand colors map to dark theme accents and personal vs clinic-wide theme.",
    example: "Light/dark toggle stays per browser",
  },
  {
    topic: "Locale & formatting",
    description:
      "Date, time, currency, phone number, and language preferences across the app.",
    example: "Product defaults (developer can localize)",
  },
];

const INVENTORY_DEVELOPER_TOPICS = [
  {
    topic: "Low stock & expiry alerts",
    description:
      "Thresholds for reorder warnings, expiry lead days, and notification recipients.",
    example: "Inventory alerts module",
  },
  {
    topic: "Consignment settlement",
    description:
      "How consignment usage is billed, settled, and reported to suppliers.",
    example: "Consignment settlement workflow",
  },
  {
    topic: "Batch & SKU numbering",
    description:
      "Auto-generated batch codes, barcode formats, and product code conventions.",
    example: "Manual batch entry today",
  },
  {
    topic: "Treatment template defaults",
    description:
      "Default products per treatment, optional vs required lines, and stock validation rules.",
    example: "Treatment templates in inventory",
  },
  {
    topic: "Auto COGS posting",
    description:
      "When treatment stock deductions create finance journal entries and which accounts are used.",
    example: "Linked to finance chart of accounts",
  },
  {
    topic: "Product master data",
    description:
      "Custom categories, units, types, and fields for clinic-specific product attributes.",
    example: "Categories, units, and types modules",
  },
];

const FINANCIAL_DEVELOPER_TOPICS = [
  {
    topic: "Invoice & receipt formats",
    description:
      "Number prefixes, padding, branch-specific sequences, and receipt numbering rules.",
    example: "INV-000001 sequence (editable next #)",
  },
  {
    topic: "Chart of accounts mapping",
    description:
      "Default accounts for sales, COGS, tax, discounts, and payment clearing.",
    example: "Finance chart of accounts module",
  },
  {
    topic: "Tax rules",
    description:
      "Multiple tax rates, tax-inclusive pricing, exemptions, and line-level tax behavior.",
    example: "Single default VAT % when enabled",
  },
  {
    topic: "Payment integrations",
    description:
      "Live bank feeds, payment gateways, or automatic reconciliation with transaction methods.",
    example: "Transaction methods are presets only",
  },
  {
    topic: "Branch accounting",
    description:
      "Separate books per branch, inter-branch transfers, and branch default on new documents.",
    example: "Default branch setting (optional)",
  },
  {
    topic: "Accounting automation",
    description:
      "Auto journal entries from invoices, expenses, payroll, and inventory movements.",
    example: "Finance transactions & journal entries",
  },
];

const BRAND_COLOR_REFERENCE = [
  {
    key: "primary_color",
    token: "Primary",
    usedFor: "Buttons, links, focus rings",
  },
  {
    key: "secondary_color",
    token: "Secondary",
    usedFor: "Secondary actions and highlights",
  },
  {
    key: "background_color",
    token: "Page background",
    usedFor: "Main canvas behind content (light mode)",
  },
  {
    key: "sidebar_accent_color",
    token: "Sidebar accent",
    usedFor: "Active item and avatar accents",
  },
];

function formatOperationTimeRange(start, end) {
  const from = (start || "—").trim();
  const until = (end || "—").trim();
  return `${from} – ${until}`;
}

function humanizeSlug(slug) {
  return String(slug || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveRoleLabels(slugs, roleOptions) {
  const list = Array.isArray(slugs) ? slugs : [];
  if (list.length === 0) return "None selected";
  const bySlug = new Map(
    (roleOptions || []).map((role) => [role.slug, role.name || role.slug]),
  );
  return list.map((slug) => bySlug.get(slug) || humanizeSlug(slug)).join(", ");
}

function summarizeLiveboardRules(rules) {
  const source = rules && typeof rules === "object" ? rules : DEFAULT_LIVEBOARD_RULES;
  return Object.entries(source).map(([action, roleMap]) => {
    const enabledRoles = Object.entries(roleMap || {})
      .filter(([, enabled]) => enabled)
      .map(([role]) => humanizeSlug(role));
    return {
      action,
      label: LIVEBOARD_ACTION_LABELS[action] || humanizeSlug(action),
      roles: enabledRoles.length ? enabledRoles.join(", ") : "None",
    };
  });
}

function joinList(values) {
  const list = (values || []).filter(Boolean);
  return list.length ? list.join(", ") : "None";
}

function SettingsReferenceFooter({ area }) {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
      Share this summary with your software developer when planning clinic-specific{" "}
      {area} changes. Values above reflect saved settings, not unsaved edits.
    </Typography>
  );
}

function ReferenceBlockTitle({ title, chipLabel, chipColor }) {
  return (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      flexWrap="wrap"
      useFlexGap
      sx={{ mb: 1.5 }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {chipLabel ? (
        <Chip
          label={chipLabel}
          size="small"
          color={chipColor}
          variant="outlined"
        />
      ) : null}
    </Stack>
  );
}

function DeveloperTopicsTable({ topics }) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Topic</TableCell>
          <TableCell>What can be tailored</TableCell>
          <TableCell>Current behavior</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {topics.map((row) => (
          <TableRow key={row.topic}>
            <TableCell sx={{ fontWeight: 600 }}>{row.topic}</TableCell>
            <TableCell>{row.description}</TableCell>
            <TableCell>{row.example}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function InAppSettingsTable({ rows }) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Setting</TableCell>
          <TableCell>Current value</TableCell>
          <TableCell>Used in</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.setting}>
            <TableCell sx={{ fontWeight: 600 }}>{row.setting}</TableCell>
            <TableCell>{row.value}</TableCell>
            <TableCell>{row.usedIn}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function OperationSettingsReference({ settings, roleOptions }) {
  const visitStages = Object.values(VISIT_STATUS_CONFIG)
    .map((cfg) => cfg.label)
    .join(" → ");
  const liveboardRows = useMemo(
    () => summarizeLiveboardRules(settings?.liveboard_rules),
    [settings?.liveboard_rules],
  );
  const inAppRows = useMemo(
    () => [
      {
        setting: "Appointment hours",
        value: formatOperationTimeRange(
          settings?.appointment_hours_start,
          settings?.appointment_hours_end,
        ),
        usedIn: "Appointments",
      },
      {
        setting: "HR default shift",
        value: `${formatOperationTimeRange(
          settings?.hr_default_shift_start,
          settings?.hr_default_shift_end,
        )} · ${settings?.hr_default_grace_minutes ?? 10} min grace`,
        usedIn: "Attendance & HR",
      },
      {
        setting: "Assign doctor roles",
        value: resolveRoleLabels(settings?.assign_doctor_roles, roleOptions),
        usedIn: "Visit History",
      },
      {
        setting: "Visit workflow stages",
        value: visitStages,
        usedIn: "Visit History & rooms",
      },
    ],
    [settings, roleOptions, visitStages],
  );

  return (
    <SectionCard>
      <SectionHeader
        icon={BuildOutlinedIcon}
        title="Operation configuration reference"
        description="Current operation setup and areas your clinic can discuss with the software developer when requesting customized operation settings."
      />
      <Box sx={{ px: { xs: 2.5, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
        <Stack spacing={3.5}>
          <Box>
            <ReferenceBlockTitle
              title="Settings configured in this tab"
              chipLabel="Editable here"
              chipColor="primary"
            />
            <InAppSettingsTable rows={inAppRows.slice(0, 3)} />
          </Box>

          <Box>
            <ReferenceBlockTitle
              title="Visit workflow"
              chipLabel="Developer customization"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              {visitStages}
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Stage key</TableCell>
                  <TableCell>Display label</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(VISIT_STATUS_CONFIG).map(([key, cfg]) => (
                  <TableRow key={key}>
                    <TableCell
                      sx={{
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize: 12,
                      }}
                    >
                      {key}
                    </TableCell>
                    <TableCell>{cfg.label}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <Box>
            <ReferenceBlockTitle
              title="Visit History button permissions"
              chipLabel="Developer customization"
            />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Action</TableCell>
                  <TableCell>Allowed roles</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {liveboardRows.map((row) => (
                  <TableRow key={row.action}>
                    <TableCell sx={{ fontWeight: 600 }}>{row.label}</TableCell>
                    <TableCell>{row.roles}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <Box>
            <ReferenceBlockTitle
              title="Additional operation customizations"
              chipLabel="Discuss with developer"
            />
            <DeveloperTopicsTable topics={OPERATION_DEVELOPER_TOPICS} />
          </Box>

          <SettingsReferenceFooter area="operation" />
        </Stack>
      </Box>
    </SectionCard>
  );
}

function GeneralSettingsReference({ settings }) {
  const inAppRows = useMemo(
    () => [
      {
        setting: "Clinic name",
        value: settings?.clinic_name || "—",
        usedIn: "Sidebar, login, PDFs",
      },
      {
        setting: "Description",
        value: settings?.clinic_description || "—",
        usedIn: "Profile & documents",
      },
      {
        setting: "Address",
        value: settings?.clinic_address || "—",
        usedIn: "Letterhead & receipts",
      },
      {
        setting: "Phone numbers",
        value: joinList(settings?.clinic_phones),
        usedIn: "Contact details",
      },
      {
        setting: "Email addresses",
        value: joinList(settings?.clinic_emails),
        usedIn: "Contact details",
      },
      {
        setting: "Website",
        value: settings?.clinic_website || "—",
        usedIn: "Profile & documents",
      },
      {
        setting: "Logo",
        value: settings?.logo_url ? "Uploaded" : "Not set",
        usedIn: "Sidebar & sign-in",
      },
    ],
    [settings],
  );

  const colorRows = useMemo(
    () =>
      BRAND_COLOR_REFERENCE.map((row) => ({
        token: row.token,
        value:
          settings?.[row.key] ||
          DEFAULT_BRAND_COLORS[row.key] ||
          "—",
        usedFor: row.usedFor,
      })),
    [settings],
  );

  return (
    <SectionCard>
      <SectionHeader
        icon={BuildOutlinedIcon}
        title="General configuration reference"
        description="Current clinic profile, branding, and areas your clinic can discuss with the software developer when requesting customized general settings."
      />
      <Box sx={{ px: { xs: 2.5, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
        <Stack spacing={3.5}>
          <Box>
            <ReferenceBlockTitle
              title="Settings configured in this tab"
              chipLabel="Editable here"
              chipColor="primary"
            />
            <InAppSettingsTable rows={inAppRows} />
          </Box>

          <Box>
            <ReferenceBlockTitle
              title="Brand color tokens"
              chipLabel="Editable here"
              chipColor="primary"
            />
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Token</TableCell>
                  <TableCell>Current value</TableCell>
                  <TableCell>Used for</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {colorRows.map((row) => (
                  <TableRow key={row.token}>
                    <TableCell sx={{ fontWeight: 600 }}>{row.token}</TableCell>
                    <TableCell
                      sx={{
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, monospace",
                        fontSize: 12,
                      }}
                    >
                      {row.value}
                    </TableCell>
                    <TableCell>{row.usedFor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <Box>
            <ReferenceBlockTitle
              title="Additional general customizations"
              chipLabel="Discuss with developer"
            />
            <DeveloperTopicsTable topics={GENERAL_DEVELOPER_TOPICS} />
          </Box>

          <SettingsReferenceFooter area="general" />
        </Stack>
      </Box>
    </SectionCard>
  );
}

function InventorySettingsReference({ settings }) {
  const fifoPreference =
    settings?.inventory_fifo_ownership_preference === "consignment"
      ? "Consignment batches first"
      : "Purchased batches first";

  const inAppRows = useMemo(
    () => [
      {
        setting: "Treatment stock deduction",
        value: fifoPreference,
        usedIn: "Treatment sessions",
      },
    ],
    [fifoPreference],
  );

  return (
    <SectionCard>
      <SectionHeader
        icon={BuildOutlinedIcon}
        title="Inventory configuration reference"
        description="Current inventory behavior and areas your clinic can discuss with the software developer when requesting customized inventory settings."
      />
      <Box sx={{ px: { xs: 2.5, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
        <Stack spacing={3.5}>
          <Box>
            <ReferenceBlockTitle
              title="Settings configured in this tab"
              chipLabel="Editable here"
              chipColor="primary"
            />
            <InAppSettingsTable rows={inAppRows} />
          </Box>

          <Box>
            <ReferenceBlockTitle
              title="Stock deduction behavior"
              chipLabel="Developer customization"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              FIFO applies within each ownership group (nearest expiry first).
              The preferred group is used first during treatments; remaining need
              is fulfilled from the other group automatically.
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Rule</TableCell>
                  <TableCell>Current behavior</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Expiry ordering</TableCell>
                  <TableCell>FIFO within purchased and consignment groups</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Preferred group</TableCell>
                  <TableCell>{fifoPreference}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Fallback</TableCell>
                  <TableCell>
                    Remaining quantity taken from the other ownership group
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Box>

          <Box>
            <ReferenceBlockTitle
              title="Additional inventory customizations"
              chipLabel="Discuss with developer"
            />
            <DeveloperTopicsTable topics={INVENTORY_DEVELOPER_TOPICS} />
          </Box>

          <SettingsReferenceFooter area="inventory" />
        </Stack>
      </Box>
    </SectionCard>
  );
}

function FinancialSettingsReference({
  settings,
  branches,
  transactionMethods,
}) {
  const defaultBranch =
    branches.find((b) => String(b.id) === String(settings?.default_branch_id))
      ?.name || "Not set";
  const vatSummary = settings?.vat_enabled
    ? `On · ${settings?.default_vat_percent ?? 0}% default when line tax is 0`
    : "Off";

  const inAppRows = useMemo(
    () => [
      {
        setting: "Next invoice number",
        value: settings?.invoice_next_number ?? "—",
        usedIn: "Paid invoices (INV-000001)",
      },
      {
        setting: "Tax on invoices",
        value: vatSummary,
        usedIn: "New invoice lines",
      },
      {
        setting: "Default branch",
        value: defaultBranch,
        usedIn: "Invoices & payments",
      },
    ],
    [settings?.invoice_next_number, vatSummary, defaultBranch],
  );

  const transactionMethodRows = useMemo(
    () =>
      (transactionMethods || []).map((row) => ({
        id: row.id,
        name: row.name,
        ledger:
          LEDGER_KIND_OPTIONS.find((o) => o.value === row.ledger_kind)?.label ||
          row.ledger_kind ||
          "—",
        coa: row.chart_of_account
          ? `${row.chart_of_account.code ? `${row.chart_of_account.code} — ` : ""}${row.chart_of_account.name || ""}`.trim()
          : "—",
        default: row.is_default ? "Yes" : "—",
        status: row.status || "—",
      })),
    [transactionMethods],
  );

  return (
    <SectionCard>
      <SectionHeader
        icon={BuildOutlinedIcon}
        title="Financial configuration reference"
        description="Current finance defaults and areas your clinic can discuss with the software developer when requesting customized financial settings."
      />
      <Box sx={{ px: { xs: 2.5, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
        <Stack spacing={3.5}>
          <Box>
            <ReferenceBlockTitle
              title="Settings configured in this tab"
              chipLabel="Editable here"
              chipColor="primary"
            />
            <InAppSettingsTable rows={inAppRows} />
          </Box>

          <Box>
            <ReferenceBlockTitle
              title="Transaction methods"
              chipLabel={
                transactionMethodRows.length ? "Editable here" : "Owner access"
              }
              chipColor={
                transactionMethodRows.length ? "primary" : undefined
              }
            />
            {transactionMethodRows.length ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Ledger</TableCell>
                    <TableCell>Linked COA</TableCell>
                    <TableCell>Default</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactionMethodRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                      <TableCell>{row.ledger}</TableCell>
                      <TableCell>{row.coa}</TableCell>
                      <TableCell>{row.default}</TableCell>
                      <TableCell sx={{ textTransform: "capitalize" }}>
                        {row.status}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Transaction method details are available to owner accounts in
                this tab.
              </Typography>
            )}
          </Box>

          <Box>
            <ReferenceBlockTitle
              title="Additional financial customizations"
              chipLabel="Discuss with developer"
            />
            <DeveloperTopicsTable topics={FINANCIAL_DEVELOPER_TOPICS} />
          </Box>

          <SettingsReferenceFooter area="financial" />
        </Stack>
      </Box>
    </SectionCard>
  );
}

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
    { label: "Visit History", icon: ViewKanbanIcon, active: true },
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
    hr_default_grace_minutes: "10",
    hr_default_shift_start: "09:00",
    hr_default_shift_end: "18:00",
    default_branch_id: "",
    vat_enabled: false,
    default_vat_percent: "0",
    assign_doctor_roles: [],
    inventory_fifo_ownership_preference: "purchased",
  });
  const [branches, setBranches] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [roleOptionsLoading, setRoleOptionsLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoiceNextDraft, setInvoiceNextDraft] = useState("1");
  const [savingInvoiceSetting, setSavingInvoiceSetting] = useState(false);
  const [transactionMethods, setTransactionMethods] = useState([]);
  const [tmLoading, setTmLoading] = useState(false);
  const [tmDialogOpen, setTmDialogOpen] = useState(false);
  const [tmEditingId, setTmEditingId] = useState(null);
  const [tmSaving, setTmSaving] = useState(false);
  const [tmAssetCoaRows, setTmAssetCoaRows] = useState([]);
  const [tmForm, setTmForm] = useState({
    name: "",
    account_or_phone: "",
    bank_name: "",
    memo: "",
    is_default: false,
    status: "active",
    ledger_kind: "transfer",
    chart_of_account_id: "",
  });
  const [tmDialogBaseline, setTmDialogBaseline] = useState("");

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
      hr_default_grace_minutes: String(settings.hr_default_grace_minutes ?? 10),
      hr_default_shift_start: settings.hr_default_shift_start ?? "09:00",
      hr_default_shift_end: settings.hr_default_shift_end ?? "18:00",
      default_branch_id:
        settings.default_branch_id != null && settings.default_branch_id !== ""
          ? String(settings.default_branch_id)
          : "",
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
    });
  }, [settings]);

  useEffect(() => {
    const nextNumber = settings?.invoice_next_number;
    if (nextNumber != null && nextNumber !== "") {
      setInvoiceNextDraft(String(nextNumber));
    }
  }, [settings?.invoice_next_number]);

  useEffect(() => {
    getBranches()
      .then((data) => setBranches(Array.isArray(data) ? data : []))
      .catch(() => setBranches([]));
  }, []);

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

  const canManageTransactionMethods = useMemo(
    () => Boolean(user && hasStrictRole(user, "owner")),
    [user],
  );

  useEffect(() => {
    if (tab !== "financial") {
      return undefined;
    }
    let cancelled = false;
    if (canManageTransactionMethods) {
      setTmLoading(true);
    }
    getTransactionMethods()
      .then((rows) => {
        if (!cancelled) {
          setTransactionMethods(Array.isArray(rows) ? rows : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTransactionMethods([]);
        }
      })
      .finally(() => {
        if (!cancelled && canManageTransactionMethods) {
          setTmLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tab, canManageTransactionMethods]);

  useEffect(() => {
    if (!tmDialogOpen || !canManageTransactionMethods) {
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const accounts = await listChartOfAccounts({
          type: "asset",
          is_active: true,
        });
        if (!cancelled) {
          setTmAssetCoaRows(Array.isArray(accounts) ? accounts : []);
        }
      } catch {
        if (!cancelled) {
          setTmAssetCoaRows([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tmDialogOpen, canManageTransactionMethods]);

  const logoPreview = useMemo(() => {
    if (logoFile) return URL.createObjectURL(logoFile);
    if (removeLogo) return null;
    return settings.logo_url || null;
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
        payload.hr_default_grace_minutes = form.hr_default_grace_minutes;
        payload.hr_default_shift_start = form.hr_default_shift_start;
        payload.hr_default_shift_end = form.hr_default_shift_end;
      }
      payload.default_branch_id = form.default_branch_id || null;
      payload.vat_enabled = form.vat_enabled;
      payload.default_vat_percent = form.default_vat_percent;
      if (canEditAppointmentHours) {
        payload.assign_doctor_roles = JSON.stringify(
          form.assign_doctor_roles ?? [],
        );
      }
      payload.inventory_fifo_ownership_preference =
        form.inventory_fifo_ownership_preference ?? "purchased";
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
          settings.hr_default_grace_minutes ?? 10;
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

  const tmSnapshot = () =>
    JSON.stringify({
      id: tmEditingId,
      name: tmForm.name,
      account_or_phone: tmForm.account_or_phone,
      bank_name: tmForm.bank_name,
      memo: tmForm.memo,
      is_default: tmForm.is_default,
      status: tmForm.status,
      ledger_kind: tmForm.ledger_kind,
      chart_of_account_id: tmForm.chart_of_account_id,
    });

  const isTmDialogDirty = () => tmSnapshot() !== tmDialogBaseline;

  const openTmDialogCreate = () => {
    setTmEditingId(null);
    const initial = {
      name: "",
      account_or_phone: "",
      bank_name: "",
      memo: "",
      is_default: false,
      status: "active",
      ledger_kind: "transfer",
      chart_of_account_id: "",
    };
    setTmForm(initial);
    setTmDialogBaseline(
      JSON.stringify({
        id: null,
        ...initial,
      }),
    );
    setTmDialogOpen(true);
  };

  const openTmDialogEdit = (row) => {
    setTmEditingId(row.id);
    const next = {
      name: row.name || "",
      account_or_phone: row.account_or_phone || "",
      bank_name: row.bank_name || "",
      memo: row.memo || "",
      is_default: Boolean(row.is_default),
      status: row.status || "active",
      ledger_kind: row.ledger_kind || "transfer",
      chart_of_account_id:
        row.chart_of_account_id != null ? String(row.chart_of_account_id) : "",
    };
    setTmForm(next);
    setTmDialogBaseline(
      JSON.stringify({
        id: row.id,
        ...next,
      }),
    );
    setTmDialogOpen(true);
  };

  const requestCloseTmDialog = async () => {
    if (isTmDialogDirty()) {
      const ok = await askConfirm({
        title: "Discard changes?",
        message:
          "You have unsaved changes for this transaction method. Close without saving?",
        confirmText: "Discard",
      });
      if (!ok) return;
    }
    setTmDialogOpen(false);
  };

  const handleSaveTm = async () => {
    if (!String(tmForm.name || "").trim()) {
      pushToast({ message: "Name is required.", severity: "warning" });
      return;
    }
    setTmSaving(true);
    try {
      const coaPayload = () => {
        const s = String(tmForm.chart_of_account_id ?? "").trim();
        if (s === "") {
          return { chart_of_account_id: null };
        }
        return { chart_of_account_id: Number(s) };
      };
      if (tmEditingId) {
        const editing = transactionMethods.find((r) => r.id === tmEditingId);
        const payload = editing?.is_system
          ? {
              memo: tmForm.memo,
              is_default: tmForm.is_default,
              status: tmForm.status,
              ...coaPayload(),
            }
          : {
              name: tmForm.name.trim(),
              account_or_phone: tmForm.account_or_phone.trim() || null,
              bank_name: tmForm.bank_name.trim() || null,
              memo: tmForm.memo.trim() || null,
              is_default: tmForm.is_default,
              status: tmForm.status,
              ledger_kind: tmForm.ledger_kind,
              ...coaPayload(),
            };
        await updateTransactionMethod(tmEditingId, payload);
      } else {
        await createTransactionMethod({
          name: tmForm.name.trim(),
          account_or_phone: tmForm.account_or_phone.trim() || null,
          bank_name: tmForm.bank_name.trim() || null,
          memo: tmForm.memo.trim() || null,
          is_default: tmForm.is_default,
          status: tmForm.status,
          ledger_kind: tmForm.ledger_kind,
          ...coaPayload(),
        });
      }
      const rows = await getTransactionMethods();
      setTransactionMethods(Array.isArray(rows) ? rows : []);
      setTmDialogOpen(false);
      pushToast({ message: "Transaction method saved.", severity: "success" });
    } catch (e) {
      pushToast({
        message: resolveApiError(e, "Could not save transaction method."),
        severity: "error",
      });
    } finally {
      setTmSaving(false);
    }
  };

  const handleDeleteTm = async (row) => {
    if (row.is_system) return;
    const ok = await askConfirm({
      title: "Delete transaction method",
      message: `Delete "${row.name}"? This cannot be undone.`,
      confirmText: "Delete",
    });
    if (!ok) return;
    try {
      await deleteTransactionMethod(row.id);
      setTransactionMethods((prev) => prev.filter((r) => r.id !== row.id));
      pushToast({ message: "Deleted.", severity: "success" });
    } catch (e) {
      pushToast({
        message: resolveApiError(e, "Could not delete."),
        severity: "error",
      });
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
              color: "primary.main",
            },
          }}
        >
          <Tab value="general" label="General" />
          <Tab value="operation" label="Operation" />
          <Tab value="inventory" label="Inventory" />
          <Tab value="financial" label="Financial" />
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
                    <Box
                      component="img"
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
              </Box>
            </SectionCard>

            <SectionCard>
              <SectionHeader
                icon={EventAvailableOutlinedIcon}
                title="Default Operation Start Hours"
                description="HR default schedule baseline for all staff attendance calculations. Each staff can still override this in their weekly schedule."
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
                    label="Default grace minutes"
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
                  />
                </Stack>
              </Box>
            </SectionCard>

            <SectionCard>
              <SectionHeader
                icon={LocalHospitalOutlinedIcon}
                title="Assign doctor list"
                description="Users with these roles will appear in the Visit History 'Assign doctor' dropdown."
              />
              <Box sx={{ px: { xs: 2.5, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
                {roleOptionsLoading ? (
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{ color: "text.secondary" }}
                  >
                    <CircularProgress size={18} />
                    <Typography variant="body2">Loading roles…</Typography>
                  </Stack>
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

        {tab === "operation" && (
          <OperationSettingsReference
            settings={settings}
            roleOptions={roleOptions}
          />
        )}

        {tab === "inventory" && (
          <SectionCard>
            <SectionHeader
              icon={Inventory2OutlinedIcon}
              title="Treatment stock deduction"
              description="FIFO still applies inside each ownership group (nearest expiry first). The clinic uses this batch group first during treatments; remaining need is fulfilled from the other group automatically."
            />
            <Box sx={{ px: { xs: 2.5, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}>
              <FormControl component="fieldset" variant="standard">
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
            </Box>
          </SectionCard>
        )}

        {tab === "inventory" && (
          <InventorySettingsReference settings={settings} />
        )}

        {tab === "financial" && (
          <>
            <SectionCard>
              <SectionHeader
                icon={AccountBalanceOutlinedIcon}
                title="Financial defaults"
                description="Default branch for new invoices and payments when not specified. Optional VAT defaults apply to new invoices when tax is not set on the line."
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
                  {/* <TextField
                    select
                    label="Default branch"
                    fullWidth
                    value={form.default_branch_id}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        default_branch_id: e.target.value,
                      }))
                    }
                  >
                    <MenuItem value="">Not set</MenuItem>
                    {branches.map((b) => (
                      <MenuItem key={b.id} value={String(b.id)}>
                        {b.name}
                      </MenuItem>
                    ))}
                  </TextField> */}
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

            {canManageTransactionMethods && (
              <SectionCard>
                <SectionHeader
                  icon={AccountBalanceOutlinedIcon}
                  title="Transaction methods"
                  description="Presets for how money is received or paid (not connected to live banks). Used on invoices when recording payment. Cash is included by default."
                />
                <Box
                  sx={{ px: { xs: 2.5, sm: 3, md: 4 }, py: { xs: 3, md: 4 } }}
                >
                  <Stack spacing={2}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                      alignItems={{ xs: "stretch", sm: "center" }}
                      justifyContent="space-between"
                    >
                      <Typography variant="body2" color="text.secondary">
                        Ledger category maps each method to reporting groups
                        (cash, transfer, e-wallet, card, other).
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={openTmDialogCreate}
                        sx={{ alignSelf: { xs: "stretch", sm: "center" } }}
                      >
                        Add new
                      </Button>
                    </Stack>
                    {tmLoading ? (
                      <Box display="flex" justifyContent="center" py={3}>
                        <CircularProgress size={32} />
                      </Box>
                    ) : (
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Account / phone</TableCell>
                            <TableCell>Bank</TableCell>
                            <TableCell>Linked COA</TableCell>
                            <TableCell>Ledger</TableCell>
                            <TableCell>Default</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {transactionMethods.map((row) => (
                            <TableRow key={row.id}>
                              <TableCell>{row.name}</TableCell>
                              <TableCell>
                                {row.account_or_phone || "—"}
                              </TableCell>
                              <TableCell>{row.bank_name || "—"}</TableCell>
                              <TableCell>
                                {row.chart_of_account
                                  ? `${row.chart_of_account.code ? `${row.chart_of_account.code} — ` : ""}${row.chart_of_account.name || ""}`.trim() ||
                                    "—"
                                  : "—"}
                              </TableCell>
                              <TableCell>{row.ledger_kind}</TableCell>
                              <TableCell>
                                {row.is_default ? "Yes" : "—"}
                              </TableCell>
                              <TableCell sx={{ textTransform: "capitalize" }}>
                                {row.status}
                              </TableCell>
                              <TableCell align="right">
                                <IconButton
                                  size="small"
                                  aria-label={`Edit ${row.name}`}
                                  onClick={() => openTmDialogEdit(row)}
                                >
                                  <EditOutlinedIcon fontSize="small" />
                                </IconButton>
                                {!row.is_system && (
                                  <IconButton
                                    size="small"
                                    color="error"
                                    aria-label={`Delete ${row.name}`}
                                    onClick={() => handleDeleteTm(row)}
                                  >
                                    <DeleteOutlineIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Stack>
                </Box>
              </SectionCard>
            )}

            {canManageTransactionMethods && (
              <Dialog
                open={tmDialogOpen}
                onClose={() => {
                  void requestCloseTmDialog();
                }}
                fullWidth
                maxWidth="sm"
              >
                <DialogTitle>
                  {tmEditingId
                    ? "Edit transaction method"
                    : "New transaction method"}
                </DialogTitle>
                <DialogContent>
                  <Stack spacing={2} sx={{ mt: 1 }}>
                    {tmEditingId &&
                    transactionMethods.find((r) => r.id === tmEditingId)
                      ?.is_system ? (
                      <>
                        <Typography variant="body2" color="text.secondary">
                          System Cash: you can adjust memo, default flag,
                          status, and which chart-of-accounts asset receives
                          cash postings.
                        </Typography>
                        <ChartOfAccountPicker
                          accounts={tmAssetCoaRows}
                          value={tmForm.chart_of_account_id}
                          onChange={(id) =>
                            setTmForm((p) => ({
                              ...p,
                              chart_of_account_id: id,
                            }))
                          }
                          onAccountsChange={setTmAssetCoaRows}
                          listParams={{ type: "asset", is_active: true }}
                          dialogDefaultType="asset"
                          label="Ledger account (chart of accounts)"
                          size="small"
                        />
                        <TextField
                          label="Memo"
                          fullWidth
                          multiline
                          minRows={2}
                          value={tmForm.memo}
                          onChange={(e) =>
                            setTmForm((p) => ({ ...p, memo: e.target.value }))
                          }
                        />
                        <TextField
                          select
                          label="Status"
                          fullWidth
                          value={tmForm.status}
                          onChange={(e) =>
                            setTmForm((p) => ({ ...p, status: e.target.value }))
                          }
                        >
                          {TM_STATUS_OPTIONS.map((o) => (
                            <MenuItem key={o.value} value={o.value}>
                              {o.label}
                            </MenuItem>
                          ))}
                        </TextField>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={tmForm.is_default}
                              onChange={(e) =>
                                setTmForm((p) => ({
                                  ...p,
                                  is_default: e.target.checked,
                                }))
                              }
                            />
                          }
                          label="Default receive method"
                        />
                      </>
                    ) : (
                      <>
                        <TextField
                          label="Name"
                          required
                          fullWidth
                          value={tmForm.name}
                          onChange={(e) =>
                            setTmForm((p) => ({ ...p, name: e.target.value }))
                          }
                        />
                        <TextField
                          label="Account no. / phone no."
                          fullWidth
                          value={tmForm.account_or_phone}
                          onChange={(e) =>
                            setTmForm((p) => ({
                              ...p,
                              account_or_phone: e.target.value,
                            }))
                          }
                        />
                        <TextField
                          label="Bank name"
                          fullWidth
                          value={tmForm.bank_name}
                          onChange={(e) =>
                            setTmForm((p) => ({
                              ...p,
                              bank_name: e.target.value,
                            }))
                          }
                        />
                        <TextField
                          label="Memo"
                          fullWidth
                          multiline
                          minRows={2}
                          value={tmForm.memo}
                          onChange={(e) =>
                            setTmForm((p) => ({ ...p, memo: e.target.value }))
                          }
                        />
                        <TextField
                          select
                          label="Ledger category"
                          fullWidth
                          value={tmForm.ledger_kind}
                          onChange={(e) =>
                            setTmForm((p) => ({
                              ...p,
                              ledger_kind: e.target.value,
                            }))
                          }
                        >
                          {LEDGER_KIND_OPTIONS.map((o) => (
                            <MenuItem key={o.value} value={o.value}>
                              {o.label}
                            </MenuItem>
                          ))}
                        </TextField>
                        <ChartOfAccountPicker
                          accounts={tmAssetCoaRows}
                          value={tmForm.chart_of_account_id}
                          onChange={(id) =>
                            setTmForm((p) => ({
                              ...p,
                              chart_of_account_id: id,
                            }))
                          }
                          onAccountsChange={setTmAssetCoaRows}
                          listParams={{ type: "asset", is_active: true }}
                          dialogDefaultType="asset"
                          label="Ledger account (chart of accounts)"
                          size="small"
                        />
                        <TextField
                          select
                          label="Status"
                          fullWidth
                          value={tmForm.status}
                          onChange={(e) =>
                            setTmForm((p) => ({ ...p, status: e.target.value }))
                          }
                        >
                          {TM_STATUS_OPTIONS.map((o) => (
                            <MenuItem key={o.value} value={o.value}>
                              {o.label}
                            </MenuItem>
                          ))}
                        </TextField>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={tmForm.is_default}
                              onChange={(e) =>
                                setTmForm((p) => ({
                                  ...p,
                                  is_default: e.target.checked,
                                }))
                              }
                            />
                          }
                          label="Default receive method"
                        />
                      </>
                    )}
                  </Stack>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => void requestCloseTmDialog()}>
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => void handleSaveTm()}
                    disabled={tmSaving}
                  >
                    {tmSaving ? "Saving…" : "Save"}
                  </Button>
                </DialogActions>
              </Dialog>
            )}
          </>
        )}

        {tab === "financial" && (
          <FinancialSettingsReference
            settings={settings}
            branches={branches}
            transactionMethods={transactionMethods}
          />
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

        {tab === "general" && (
          <GeneralSettingsReference settings={settings} />
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
