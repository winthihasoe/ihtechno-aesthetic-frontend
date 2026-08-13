import { Fragment, useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import CardGiftcardOutlinedIcon from "@mui/icons-material/CardGiftcardOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MedicalServicesOutlinedIcon from "@mui/icons-material/MedicalServicesOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import GuidedEmptyState from "../../components/common/GuidedEmptyState";
import {
  getPackageMarginsReport,
  getTreatmentMarginsReport,
} from "../../services/reportService";
import { getTreatmentTemplateCost } from "../../services/treatmentTemplateService";
import { getPackageCost } from "../../services/packageService";
import { resolveApiError } from "../../services/apiClient";
import useAuthStore from "../../stores/authStore";
import { formatKyats } from "../../utils/formatKyats";
import { formatSessionQtyDisplay } from "../../utils/inventoryUnitsCopy";
import { resolveUserPrimaryRole } from "../../utils/workspaceRoutes";

const TREATMENT_COLUMN_COUNT = 8;
const PACKAGE_COLUMN_COUNT = 8;

const COMMISSION_ROLE_LABELS = {
  doctor: "Doctor",
  dermatologist: "Dermatologist",
  therapist: "Therapist",
  reception: "Reception / sales",
};

const TREATMENT_EMPTY_STEPS = [
  {
    icon: BuildOutlinedIcon,
    title: "Create templates",
    body: "Define each billable treatment with category, duration, and list price in Treatment Templates.",
  },
  {
    icon: ScienceOutlinedIcon,
    title: "Add preset products",
    body: "Attach the products consumed per session so material cost rolls up from inventory purchase history.",
  },
  {
    icon: PaymentsOutlinedIcon,
    title: "Set commissions",
    body: "Configure doctor, therapist, and reception commission rates — net margin appears here after price minus cost and commission.",
  },
];

const PACKAGE_EMPTY_STEPS = [
  {
    icon: CardGiftcardOutlinedIcon,
    title: "Build packages",
    body: "Create multi-session bundles in the package catalog with validity and bundle price.",
  },
  {
    icon: MedicalServicesOutlinedIcon,
    title: "Include treatments",
    body: "Add treatment lines with session counts; material cost sums from each template’s preset products.",
  },
  {
    icon: AssessmentOutlinedIcon,
    title: "Review margin",
    body: "Expand a package row here to see commission estimates and per-treatment product breakdown.",
  },
];

function formatMargin(row) {
  const margin = row.margin ?? 0;
  const pct = row.margin_pct;
  if (pct != null) {
    return `${formatKyats(margin)} (${pct}%)`;
  }
  return formatKyats(margin);
}

function formatCommissionRate(line) {
  if (line.commission_type === "percent") {
    return `${line.commission_value}%`;
  }
  if (line.commission_type === "fixed") {
    return formatKyats(line.commission_value);
  }
  return "—";
}

function formatLastPurchaseCost(line) {
  if (line.last_purchase_cost_unknown) {
    return "—";
  }
  return formatKyats(line.last_purchase_cost_per_base_unit);
}

function CommissionDetailTable({ lines }) {
  if (!lines?.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        No commission configured.
      </Typography>
    );
  }

  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
        Commission estimate
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Role</TableCell>
            <TableCell>Rate</TableCell>
            <TableCell align="right">Amount</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.map((line) => (
            <TableRow
              key={`${line.role}-${line.commission_type}-${line.commission_value}`}
            >
              <TableCell>
                {COMMISSION_ROLE_LABELS[line.role] ?? line.role}
                {line.source === "legacy" ? " (legacy)" : ""}
              </TableCell>
              <TableCell>{formatCommissionRate(line)}</TableCell>
              <TableCell align="right">
                {formatKyats(line.commission_amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function ProductDetailTable({ lines, loading, error }) {
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
        <LoadingIndicator size={40} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 1 }}>
        {error}
      </Alert>
    );
  }

  if (!lines?.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        No preset products on this treatment.
      </Typography>
    );
  }

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>Product</TableCell>
          <TableCell align="right">Preset qty</TableCell>
          <TableCell align="right">Last purchase unit cost</TableCell>
          <TableCell align="right">Line material cost</TableCell>
          <TableCell>Stock</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {lines.map((line) => (
          <TableRow key={line.product_id}>
            <TableCell>{line.product_name}</TableCell>
            <TableCell align="right">
              {formatSessionQtyDisplay(line.default_quantity, {
                use_unit_name: line.use_unit_name,
              })}
            </TableCell>
            <TableCell align="right">{formatLastPurchaseCost(line)}</TableCell>
            <TableCell align="right">
              {line.cost_unknown ? (
                <Stack
                  direction="row"
                  spacing={0.5}
                  justifyContent="flex-end"
                  alignItems="center"
                >
                  <Typography variant="body2">—</Typography>
                  <Chip size="small" color="warning" label="No cost data" />
                </Stack>
              ) : (
                formatKyats(line.line_cost)
              )}
            </TableCell>
            <TableCell>
              {line.is_out_of_stock ? (
                <Chip size="small" color="error" label="Out of stock" />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  In stock
                </Typography>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PackageItemDetailTable({ items, loading, error }) {
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
        <LoadingIndicator size={40} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 1 }}>
        {error}
      </Alert>
    );
  }

  if (!items?.length) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        No treatment lines on this package.
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      {items.map((item) => (
        <Box key={item.treatment_template_id}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
            {item.template_name}
          </Typography>
          <Table size="small" sx={{ mb: 1 }}>
            <TableHead>
              <TableRow>
                <TableCell>Sessions</TableCell>
                <TableCell align="right">Unit material cost</TableCell>
                <TableCell align="right">Line material cost</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>{item.total_sessions}</TableCell>
                <TableCell align="right">
                  {formatKyats(item.unit_material_cost)}
                </TableCell>
                <TableCell align="right">
                  {formatKyats(item.line_cost)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Typography
            variant="body2"
            fontWeight={600}
            color="text.secondary"
            sx={{ mb: 0.5 }}
          >
            Preset products
          </Typography>
          <ProductDetailTable
            lines={item.template_lines}
            loading={false}
            error=""
          />
        </Box>
      ))}
    </Stack>
  );
}

function TreatmentMarginsTab() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const rolePrefix = `/${resolveUserPrimaryRole(user)}`;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [basis, setBasis] = useState("");
  const [rows, setRows] = useState([]);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [detailById, setDetailById] = useState({});
  const [detailLoadingId, setDetailLoadingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getTreatmentMarginsReport();
      setBasis(data?.basis ?? "");
      setRows(Array.isArray(data?.templates) ? data.templates : []);
    } catch (err) {
      setError(resolveApiError(err, "Could not load treatment margins."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadDetail = useCallback(
    async (templateId) => {
      if (detailById[templateId]) return;

      setDetailLoadingId(templateId);
      try {
        const data = await getTreatmentTemplateCost(templateId);
        setDetailById((prev) => ({
          ...prev,
          [templateId]: {
            lines: data?.lines ?? [],
            commissionLines: data?.commission_lines ?? [],
            error: "",
          },
        }));
      } catch (err) {
        setDetailById((prev) => ({
          ...prev,
          [templateId]: {
            lines: [],
            commissionLines: [],
            error: resolveApiError(err, "Could not load product breakdown."),
          },
        }));
      } finally {
        setDetailLoadingId(null);
      }
    },
    [detailById],
  );

  const toggleExpandRow = (templateId) => {
    if (expandedRowId === templateId) {
      setExpandedRowId(null);
      return;
    }
    setExpandedRowId(templateId);
    loadDetail(templateId);
  };

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Net margin per treatment: price minus material cost and the sum of all
        configured role commissions (percent of price plus fixed amounts)
        {basis ? `; material cost basis: ${basis.replace(/_/g, " ")}` : ""}.
        Expand a row for commission and product breakdown.
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : rows.length === 0 && !error ? (
        <GuidedEmptyState
          icon={MedicalServicesOutlinedIcon}
          title="No treatment templates yet"
          description="Margin rows appear once treatment templates exist with prices and preset products. Create templates first, then return here to compare material cost, commission, and net margin."
          primaryAction={{
            label: "Open treatment templates",
            onClick: () =>
              navigate(`${rolePrefix}/inventory/treatment-templates`),
            startIcon: <AddIcon />,
          }}
          steps={TREATMENT_EMPTY_STEPS}
          footer={
            <>
              Material cost uses purchase history — receive stock under{" "}
              <Typography
                component={RouterLink}
                to={`${rolePrefix}/purchases`}
                variant="body2"
                sx={{
                  color: "primary.main",
                  fontWeight: 600,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Inventory Receiving
              </Typography>
              .
            </>
          }
        />
      ) : (
        <Paper sx={{ borderRadius: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 36 }} />
                  <TableCell>Treatment</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Material cost</TableCell>
                  <TableCell align="right">Commission</TableCell>
                  <TableCell align="right">Net margin</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                    const templateId = row.treatment_template_id;
                    const isExpanded = expandedRowId === templateId;
                    const detail = detailById[templateId];

                    return (
                      <Fragment key={templateId}>
                        <TableRow
                          hover
                          onClick={() => toggleExpandRow(templateId)}
                          sx={{
                            cursor: "pointer",
                            "& .MuiTableCell-root": isExpanded
                              ? { borderBottom: 0 }
                              : undefined,
                          }}
                        >
                          <TableCell sx={{ width: 36, px: 0.5 }}>
                            <IconButton
                              size="small"
                              aria-label={
                                isExpanded
                                  ? "Collapse treatment detail"
                                  : "Expand treatment detail"
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleExpandRow(templateId);
                              }}
                              sx={{
                                transform: isExpanded
                                  ? "rotate(90deg)"
                                  : "none",
                                transition: "transform 0.15s",
                              }}
                            >
                              <ChevronRightIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.name}</Typography>
                            {row.category_name ? (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {row.category_name}
                              </Typography>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={row.is_active ? "Active" : "Inactive"}
                              color={row.is_active ? "success" : "default"}
                              variant={row.is_active ? "filled" : "outlined"}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {formatKyats(row.price)}
                          </TableCell>
                          <TableCell align="right">
                            {formatKyats(row.material_cost)}
                          </TableCell>
                          <TableCell align="right">
                            {formatKyats(row.total_commission ?? 0)}
                          </TableCell>
                          <TableCell align="right">
                            {formatMargin(row)}
                          </TableCell>
                          <TableCell>
                            {row.cost_unknown_count > 0 ? (
                              <Chip
                                size="small"
                                color="warning"
                                label={`${row.cost_unknown_count} missing cost`}
                              />
                            ) : (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                —
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>

                        {isExpanded ? (
                          <TableRow>
                            <TableCell
                              colSpan={TREATMENT_COLUMN_COUNT}
                              sx={{ py: 0, px: 1.5, borderBottom: 0 }}
                            >
                              <Box sx={{ py: 1.5, pl: 4 }}>
                                {detailLoadingId === templateId ? (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent: "center",
                                      py: 2,
                                    }}
                                  >
                                    <LoadingIndicator size={40} />
                                  </Box>
                                ) : (
                                  <>
                                    <CommissionDetailTable
                                      lines={detail?.commissionLines}
                                    />
                                    <Typography
                                      variant="subtitle2"
                                      fontWeight={700}
                                      sx={{ mb: 1 }}
                                    >
                                      Preset products
                                    </Typography>
                                    <ProductDetailTable
                                      lines={detail?.lines}
                                      loading={false}
                                      error={detail?.error}
                                    />
                                  </>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </>
  );
}

function PackageMarginsTab() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const rolePrefix = `/${resolveUserPrimaryRole(user)}`;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [basis, setBasis] = useState("");
  const [rows, setRows] = useState([]);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [detailById, setDetailById] = useState({});
  const [detailLoadingId, setDetailLoadingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPackageMarginsReport();
      setBasis(data?.basis ?? "");
      setRows(Array.isArray(data?.packages) ? data.packages : []);
    } catch (err) {
      setError(resolveApiError(err, "Could not load package margins."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadDetail = useCallback(
    async (packageId) => {
      if (detailById[packageId]) return;

      setDetailLoadingId(packageId);
      try {
        const data = await getPackageCost(packageId);
        setDetailById((prev) => ({
          ...prev,
          [packageId]: {
            items: data?.items ?? [],
            commissionLines: data?.commission_lines ?? [],
            error: "",
          },
        }));
      } catch (err) {
        setDetailById((prev) => ({
          ...prev,
          [packageId]: {
            items: [],
            commissionLines: [],
            error: resolveApiError(err, "Could not load package breakdown."),
          },
        }));
      } finally {
        setDetailLoadingId(null);
      }
    },
    [detailById],
  );

  const toggleExpandRow = (packageId) => {
    if (expandedRowId === packageId) {
      setExpandedRowId(null);
      return;
    }
    setExpandedRowId(packageId);
    loadDetail(packageId);
  };

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Net margin per package: price minus rolled-up material cost from included
        treatments (sessions × template material cost) and the sum of all configured
        role commissions (percent of price plus fixed amounts)
        {basis ? `; material cost basis: ${basis.replace(/_/g, " ")}` : ""}.
        Expand a row for commission and treatment breakdown.
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <LoadingIndicator size={112} />
        </Box>
      ) : rows.length === 0 && !error ? (
        <GuidedEmptyState
          icon={CardGiftcardOutlinedIcon}
          title="No packages yet"
          description="Package margin rows appear once catalog packages exist with prices and included treatment lines. Create packages first, then compare rolled-up material cost and commission here."
          primaryAction={{
            label: "Open packages",
            onClick: () => navigate(`${rolePrefix}/packages`),
            startIcon: <AddIcon />,
          }}
          steps={PACKAGE_EMPTY_STEPS}
          footer={
            <>
              Packages roll up costs from{" "}
              <Typography
                component={RouterLink}
                to={`${rolePrefix}/inventory/treatment-templates`}
                variant="body2"
                sx={{
                  color: "primary.main",
                  fontWeight: 600,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Treatment Templates
              </Typography>
              .
            </>
          }
        />
      ) : (
        <Paper sx={{ borderRadius: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 36 }} />
                  <TableCell>Package</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Material cost</TableCell>
                  <TableCell align="right">Commission</TableCell>
                  <TableCell align="right">Net margin</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                    const packageId = row.package_id;
                    const isExpanded = expandedRowId === packageId;
                    const detail = detailById[packageId];

                    return (
                      <Fragment key={packageId}>
                        <TableRow
                          hover
                          onClick={() => toggleExpandRow(packageId)}
                          sx={{
                            cursor: "pointer",
                            "& .MuiTableCell-root": isExpanded
                              ? { borderBottom: 0 }
                              : undefined,
                          }}
                        >
                          <TableCell sx={{ width: 36, px: 0.5 }}>
                            <IconButton
                              size="small"
                              aria-label={
                                isExpanded
                                  ? "Collapse package detail"
                                  : "Expand package detail"
                              }
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleExpandRow(packageId);
                              }}
                              sx={{
                                transform: isExpanded
                                  ? "rotate(90deg)"
                                  : "none",
                                transition: "transform 0.15s",
                              }}
                            >
                              <ChevronRightIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.name}</Typography>
                            {row.description ? (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {row.description}
                              </Typography>
                            ) : null}
                            {row.items_count > 0 ? (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                              >
                                {row.items_count} treatment line
                                {row.items_count === 1 ? "" : "s"}
                                {row.validity_days
                                  ? ` · ${row.validity_days} day validity`
                                  : ""}
                              </Typography>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={row.is_active ? "Active" : "Inactive"}
                              color={row.is_active ? "success" : "default"}
                              variant={row.is_active ? "filled" : "outlined"}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {formatKyats(row.price)}
                          </TableCell>
                          <TableCell align="right">
                            {formatKyats(row.material_cost)}
                          </TableCell>
                          <TableCell align="right">
                            {formatKyats(row.total_commission ?? 0)}
                          </TableCell>
                          <TableCell align="right">
                            {formatMargin(row)}
                          </TableCell>
                          <TableCell>
                            {row.cost_unknown_count > 0 ? (
                              <Chip
                                size="small"
                                color="warning"
                                label={`${row.cost_unknown_count} missing cost`}
                              />
                            ) : (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                —
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>

                        {isExpanded ? (
                          <TableRow>
                            <TableCell
                              colSpan={PACKAGE_COLUMN_COUNT}
                              sx={{ py: 0, px: 1.5, borderBottom: 0 }}
                            >
                              <Box sx={{ py: 1.5, pl: 4 }}>
                                {detailLoadingId === packageId ? (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      justifyContent: "center",
                                      py: 2,
                                    }}
                                  >
                                    <LoadingIndicator size={40} />
                                  </Box>
                                ) : (
                                  <>
                                    <CommissionDetailTable
                                      lines={detail?.commissionLines}
                                    />
                                    <Typography
                                      variant="subtitle2"
                                      fontWeight={700}
                                      sx={{ mb: 1 }}
                                    >
                                      Included treatments
                                    </Typography>
                                    <PackageItemDetailTable
                                      items={detail?.items}
                                      loading={false}
                                      error={detail?.error}
                                    />
                                  </>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </>
  );
}

export default function TreatmentMarginsPage() {
  const [tab, setTab] = useState("treatments");

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
        Treatment & Package Margins
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 2, maxWidth: 640, lineHeight: 1.65 }}
      >
        Pricing intelligence for treatments and packages. Confidential to owner
        and developer roles.
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_event, value) => setTab(value)}
          sx={{
            minHeight: 44,
            "& .MuiTab-root": {
              textTransform: "none",
              fontWeight: 600,
            },
            "& .MuiTab-root.Mui-selected": {
              color: "white",
            },
          }}
        >
          <Tab value="treatments" label="Treatment Margins" />
          <Tab value="packages" label="Package Margins" />
        </Tabs>
      </Box>

      {tab === "treatments" ? <TreatmentMarginsTab /> : <PackageMarginsTab />}
    </Box>
  );
}
