import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import GuidedEmptyState from "../../components/common/GuidedEmptyState";
import AddIcon from "@mui/icons-material/Add";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import MedicalServicesOutlinedIcon from "@mui/icons-material/MedicalServicesOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import useToastStore from "../../stores/toastStore";
import { resolveApiError } from "../../services/apiClient";
import { hasPermission } from "../../utils/accessUtils";
import { resolveUserPrimaryRole } from "../../utils/workspaceRoutes";
import useAuthStore from "../../stores/authStore";
import { getTreatmentTemplates } from "../../services/treatmentTemplateService";
import NewTreatmentCategoryDialog from "../../components/inventory/NewTreatmentCategoryDialog";

const MANAGEMENT_ROLES = new Set(["owner", "admin", "hr"]);

const EMPTY_STEPS = [
  {
    icon: CategoryOutlinedIcon,
    title: "Define the service",
    body: "Create each treatment with its category, sell price, and active status so staff can select it consistently.",
  },
  {
    icon: Inventory2OutlinedIcon,
    title: "Attach preset products",
    body: "Add default consumables and quantities in the template detail so treatment sessions can deduct stock accurately.",
  },
  {
    icon: PaymentsOutlinedIcon,
    title: "Set commissions",
    body: "Configure role-based commission rates for doctors, therapists, and reception before selling packages or sessions.",
  },
];

const COMMISSION_COLUMNS_BY_ROLE = {
  reception: {
    label: "Reception / sales commission",
    prefix: "reception",
  },
  sales_marketing: {
    label: "Reception / sales commission",
    prefix: "reception",
  },
  doctor: {
    label: "Doctor commission",
    prefix: "doctor",
  },
  dermatologist: {
    label: "Dermatologist commission",
    prefix: "dermatologist",
  },
  therapist: {
    label: "Therapist commission",
    prefix: "therapist",
  },
};

const COMMISSION_SET_ROLES = [
  { prefix: "doctor", label: "Doctor" },
  { prefix: "dermatologist", label: "Dermatologist" },
  { prefix: "therapist", label: "Therapist" },
  { prefix: "reception", label: "Reception / sales" },
];

function formatCommissionValue(type, value) {
  if (
    (type === "percent" || type === "fixed") &&
    value != null &&
    value !== ""
  ) {
    return type === "percent" ? `${value}%` : Number(value).toLocaleString();
  }
  return "—";
}

function formatCommissionPreview(row, prefix) {
  const type = row[`${prefix}_commission_type`];
  const value = row[`${prefix}_commission_value`];
  const formatted = formatCommissionValue(type, value);
  if (formatted !== "—" || prefix !== "reception") return formatted;

  if (
    row.commission_type &&
    row.commission_value != null &&
    row.commission_value !== ""
  ) {
    return formatCommissionValue(row.commission_type, row.commission_value);
  }
  return "—";
}

function getTreatmentTemplateColumns(role) {
  const isManagementView = MANAGEMENT_ROLES.has(role);
  const commissionColumn = COMMISSION_COLUMNS_BY_ROLE[role];

  return [
    { key: "no", label: "No." },
    { key: "name", label: "Name" },
    { key: "price", label: "Price" },
    ...(isManagementView
      ? [{ key: "commission_set", label: "Commission set" }]
      : commissionColumn
        ? [{ key: "commission", ...commissionColumn }]
        : []),
    { key: "status", label: "Status" },
  ];
}

export default function TreatmentTemplatesPage() {
  const navigate = useNavigate();
  const { pushToast } = useToastStore();
  const { user } = useAuthStore();
  const canManage = hasPermission(user, "treatment_templates.manage");
  const currentRole = resolveUserPrimaryRole(user);
  const isManagementView = MANAGEMENT_ROLES.has(currentRole);
  const columns = getTreatmentTemplateColumns(currentRole);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catOpen, setCatOpen] = useState(false);
  const showGuidedEmpty = !loading && rows.length === 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTreatmentTemplates();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Failed to load templates."),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const renderCell = (row, column, index) => {
    switch (column.key) {
      case "no":
        return <TableCell key={column.key}>{index + 1}</TableCell>;
      case "name":
        return (
          <TableCell key={column.key}>
            <Typography variant="body2">{row.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {row.category?.name ?? "—"}
            </Typography>
          </TableCell>
        );
      case "price":
        return (
          <TableCell key={column.key}>
            {row.price != null
              ? Math.round(Number(row.price || 0)).toLocaleString()
              : "—"}
          </TableCell>
        );
      case "commission":
        return (
          <TableCell key={column.key}>
            {formatCommissionPreview(row, column.prefix)}
          </TableCell>
        );
      case "commission_set":
        return (
          <TableCell key={column.key}>
            <Stack spacing={0.25}>
              {COMMISSION_SET_ROLES.map(({ prefix, label }) => (
                <Typography key={prefix} variant="body2">
                  {label}: {formatCommissionPreview(row, prefix)}
                </Typography>
              ))}
            </Stack>
          </TableCell>
        );
      case "status":
        return (
          <TableCell key={column.key}>
            <Chip
              size="small"
              label={row.is_active ? "Active" : "Inactive"}
              color={row.is_active ? "success" : "default"}
              variant={row.is_active ? "filled" : "outlined"}
            />
          </TableCell>
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Treatments
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.5, maxWidth: 640, lineHeight: 1.65 }}
          >
            Treatment templates define pricing, preset products, and commission
            rules for clinical workflows.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          {canManage && !showGuidedEmpty ? (
            <>
              {/* <Button
                variant="outlined"
                startIcon={<FolderIcon />}
                onClick={() => setCatOpen(true)}
              >
                New category
              </Button> */}
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => navigate("/inventory/treatment-templates/new")}
              >
                Create Treatment
              </Button>
            </>
          ) : null}
        </Stack>
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : showGuidedEmpty ? (
        <GuidedEmptyState
          icon={MedicalServicesOutlinedIcon}
          title="No treatment templates yet"
          description="Create reusable treatment templates before using presets on the Live Board, package catalog, and margin reports. Templates keep pricing, stock usage, and commissions consistent."
          primaryAction={
            canManage
              ? {
                  label: "Create treatment",
                  onClick: () => navigate("/inventory/treatment-templates/new"),
                  startIcon: <AddIcon />,
                }
              : null
          }
          steps={EMPTY_STEPS}
          footer="Once created, open a treatment row to manage preset products, pricing, and category details."
        />
      ) : (
        <Paper sx={{ borderRadius: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      align={column.align}
                      sx={{ fontWeight: 700 }}
                    >
                      {column.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row, index) => (
                  <TableRow
                    key={row.id}
                    hover={isManagementView}
                    onClick={
                      isManagementView
                        ? () =>
                            navigate(`/inventory/treatment-templates/${row.id}`)
                        : undefined
                    }
                    sx={isManagementView ? { cursor: "pointer" } : undefined}
                  >
                    {columns.map((column) => renderCell(row, column, index))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <NewTreatmentCategoryDialog
        open={catOpen}
        onClose={() => setCatOpen(false)}
        onSuccess={() => {
          pushToast({ message: "Category created.", severity: "success" });
        }}
      />
    </Box>
  );
}
