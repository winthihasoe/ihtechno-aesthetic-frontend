import { useCallback, useEffect, useMemo, useState, Fragment } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  Alert,
  Box,
  Typography,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Link,
  IconButton,
  Tooltip,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import GuidedEmptyState from "../../components/common/GuidedEmptyState";
import TableColumnFilterHeader from "../../components/common/TableColumnFilterHeader";
import AddIcon from "@mui/icons-material/Add";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PrecisionManufacturingOutlinedIcon from "@mui/icons-material/PrecisionManufacturingOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import dayjs from "dayjs";
import {
  getFixedAssets,
  createOpeningBalanceAsset,
  postAssetDepreciation,
  batchPostAssetDepreciation,
  getAssetCategories,
  suggestFixedAssetCode,
  getSuppliers,
} from "../../services/financeService";
import { getUsers } from "../../services/usersService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import useConfirmStore from "../../stores/confirmStore";
import { hasPermission } from "../../utils/accessUtils";
import useAuthStore from "../../stores/authStore";
import { formatKyats } from "../../utils/formatKyats";
import { getWorkspaceUrlPrefix } from "../../utils/workspaceRoutes";
import AssetCategoriesDialog from "../../components/finance/AssetCategoriesDialog";
import FixedAssetDetailPanel from "../../components/finance/FixedAssetDetailPanel";
import {
  FinancePageHeader,
  FinancePanel,
  FinancePanelHeader,
  FinancePanelTable,
  FinancePeriodToolbar,
  currentMonthKey,
  formatMonthLabel,
  monthRangeLabel,
  FixedAssetRegistrationForm,
  emptyFixedAssetForm,
  serializeFixedAssetPayload,
  useFinanceTokens,
} from "../../components/finance";
import {
  depreciationListSummary,
  formatPeriod,
  periodFromMonthKey,
  summarizeRegisterDepreciation,
} from "../../utils/fixedAssetDepreciationUtils";
import useTableColumnFilters from "../../hooks/useTableColumnFilters";

function formatDate(value) {
  if (!value) return "—";
  const d = dayjs(value);
  return d.isValid() ? d.format("DD-MM-YYYY") : value;
}

function serializeFixedAssetFormSnapshot(form) {
  return JSON.stringify(form);
}

const NAME_COL_WIDTH = 200;
const CODE_COL_WIDTH = 112;

function fixedAssetCategoryLabel(row) {
  return row.category_relation?.name ?? row.category ?? "—";
}

function fixedAssetSourceLabel(row) {
  return row.source_label ?? "—";
}

function fixedAssetCustodianLabel(row) {
  return row.custodian?.name ?? "—";
}

const FIXED_ASSET_COLUMN_FILTERS = [
  { key: "code", getValue: (row) => row.asset_code ?? "—" },
  { key: "category", getValue: (row) => fixedAssetCategoryLabel(row) },
  { key: "source", getValue: (row) => fixedAssetSourceLabel(row) },
  { key: "custodian", getValue: (row) => fixedAssetCustodianLabel(row) },
];

const EMPTY_STEPS = [
  {
    icon: CategoryOutlinedIcon,
    title: "Define categories",
    body: "Set up asset categories with useful lives and depreciation rules before registering equipment.",
  },
  {
    icon: PrecisionManufacturingOutlinedIcon,
    title: "Import Fixed Asset",
    body: "Bring existing clinic equipment into the register with cost, in-service date, and linked accounts.",
  },
  {
    icon: TrendingDownOutlinedIcon,
    title: "Post monthly depreciation",
    body: "Run depreciation each period so expense and accumulated depreciation stay current in the ledger.",
  },
];

export default function FinanceFixedAssetsPage() {
  const location = useLocation();
  const batchFilter = location.state?.import_batch_id ?? null;
  const { user } = useAuthStore();
  const { pushToast } = useToastStore();
  const { askConfirm } = useConfirmStore();
  const { financeToolbarSx, compactTableSx } = useFinanceTokens();
  const canManage = hasPermission(user, "payments.manage");
  const canImport =
    hasPermission(user, "finance.fixed_assets.import") || canManage;

  const workspacePrefix = getWorkspaceUrlPrefix(user);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const {
    filteredRows,
    columnOptions,
    getColumnSelectionArray,
    setColumnSelection,
    clearColumnSelection,
    hasActiveColumnFilters,
  } = useTableColumnFilters(rows, { columns: FIXED_ASSET_COLUMN_FILTERS });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openingWindowOpen, setOpeningWindowOpen] = useState(false);
  const [form, setForm] = useState(emptyFixedAssetForm);
  const [categories, setCategories] = useState([]);
  const [suggestedCode, setSuggestedCode] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [dialogBaseline, setDialogBaseline] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [expandedAssetId, setExpandedAssetId] = useState(null);
  const [postingMonth, setPostingMonth] = useState(currentMonthKey());
  const [batchPosting, setBatchPosting] = useState(false);

  const postingPeriod = useMemo(
    () => periodFromMonthKey(postingMonth),
    [postingMonth],
  );

  const registerDepreciationStats = useMemo(
    () =>
      summarizeRegisterDepreciation(
        filteredRows,
        postingPeriod.period_year,
        postingPeriod.period_month,
      ),
    [filteredRows, postingPeriod.period_year, postingPeriod.period_month],
  );

  const columnCount = canManage ? 10 : 9;

  const rolePrefix = useMemo(() => {
    const fromPath = location.pathname.split("/").filter(Boolean)[0];
    const pathPrefix = fromPath ? `/${fromPath}` : "";
    // Prefer workspace prefix so links stay valid (e.g. admin user on /owner/*).
    if (pathPrefix && pathPrefix === workspacePrefix) {
      return pathPrefix;
    }
    return workspacePrefix || pathPrefix;
  }, [location.pathname, workspacePrefix]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = batchFilter ? { import_batch_id: batchFilter } : {};
      const data = await getFixedAssets(params);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      pushToast({
        message: resolveApiError(e, "Failed to load assets."),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [batchFilter, pushToast]);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await getAssetCategories();
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (e) {
      pushToast({
        message: resolveApiError(e, "Failed to load asset categories."),
        severity: "error",
      });
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    suggestFixedAssetCode()
      .then((hint) =>
        setOpeningWindowOpen(Boolean(hint?.opening_balance_window_open)),
      )
      .catch(() => {});
  }, []);

  const openImportDialog = async () => {
    setForm(emptyFixedAssetForm());
    try {
      const [cats, hint, supplierRows, userRows] = await Promise.all([
        getAssetCategories(),
        suggestFixedAssetCode(),
        getSuppliers().catch(() => []),
        getUsers().catch(() => []),
      ]);
      setCategories(Array.isArray(cats) ? cats : []);
      setSuggestedCode(hint?.asset_code ?? "");
      setOpeningWindowOpen(Boolean(hint?.opening_balance_window_open));
      setSuppliers(Array.isArray(supplierRows) ? supplierRows : []);
      setStaffUsers(Array.isArray(userRows) ? userRows : []);
      const initialForm = {
        ...emptyFixedAssetForm(),
        asset_code: hint?.asset_code ?? "",
        opening_balance_date: dayjs().format("YYYY-MM-DD"),
      };
      setForm(initialForm);
      setDialogBaseline(serializeFixedAssetFormSnapshot(initialForm));
      setOpen(true);
    } catch (e) {
      pushToast({
        message: resolveApiError(e, "Could not open import form."),
        severity: "error",
      });
    }
  };

  const isDialogDirty = () =>
    serializeFixedAssetFormSnapshot(form) !== dialogBaseline;

  const requestCloseDialog = async () => {
    if (saving) return;
    if (!isDialogDirty()) {
      setOpen(false);
      return;
    }
    const ok = await askConfirm({
      title: "Discard changes?",
      message:
        "You have entered asset details that are not imported yet. Close without saving?",
      confirmText: "Discard",
      cancelText: "Keep editing",
    });
    if (ok) {
      setOpen(false);
    }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const payload = serializeFixedAssetPayload(form, {
        openingBalance: true,
      });
      const code = payload.asset_code || `FA-${Date.now()}`;
      await createOpeningBalanceAsset(payload, `ob-asset-${code}`);
      pushToast({
        message: "Opening-balance asset imported.",
        severity: "success",
      });
      setOpen(false);
      load();
    } catch (e) {
      pushToast({
        message: resolveApiError(e, "Import failed."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const runDepreciation = async (assetId, { catchUp = false } = {}) => {
    try {
      const result = await postAssetDepreciation(assetId, {
        period_year: postingPeriod.period_year,
        period_month: postingPeriod.period_month,
        catch_up: catchUp,
      });
      if (catchUp) {
        if ((result.created_count ?? 0) > 0) {
          pushToast({
            message: `Posted ${result.created_count} month(s) through ${formatMonthLabel(postingMonth)}.`,
            severity: "success",
          });
        } else {
          pushToast({
            message: `Already up to date through ${formatMonthLabel(postingMonth)}.`,
            severity: "info",
          });
        }
      } else if (result.created === false) {
        pushToast({
          message: `Already posted for ${formatPeriod(postingPeriod.period_year, postingPeriod.period_month)}.`,
          severity: "info",
        });
      } else {
        pushToast({
          message: `Posted ${formatPeriod(postingPeriod.period_year, postingPeriod.period_month)}.`,
          severity: "success",
        });
      }
      load();
    } catch (e) {
      pushToast({
        message: resolveApiError(e, "Depreciation failed."),
        severity: "error",
      });
    }
  };

  const runBatchDepreciation = async (catchUp) => {
    const label = formatMonthLabel(postingMonth);
    const ok = await askConfirm({
      title: catchUp ? "Catch up depreciation?" : "Post depreciation?",
      message: catchUp
        ? `Post all missing months through ${label} for every active asset? Each month posts a journal entry.`
        : `Post ${label} depreciation for all assets that are due for that month?`,
      confirmText: catchUp ? "Catch up all" : "Post all",
    });
    if (!ok) return;

    setBatchPosting(true);
    try {
      const result = await batchPostAssetDepreciation({
        period_year: postingPeriod.period_year,
        period_month: postingPeriod.period_month,
        catch_up: catchUp,
      });
      const created = result.periods_created ?? 0;
      const already = result.periods_already_posted ?? 0;
      if (created > 0) {
        pushToast({
          message: `Posted ${created} depreciation run(s)${already ? ` (${already} already posted).` : "."}`,
          severity: "success",
        });
      } else {
        pushToast({
          message: catchUp
            ? `No missing months through ${label}.`
            : `Nothing due for ${label}.`,
          severity: "info",
        });
      }
      if ((result.assets_with_errors ?? []).length > 0) {
        pushToast({
          message: `${result.assets_with_errors.length} asset(s) could not be posted.`,
          severity: "warning",
        });
      }
      load();
    } catch (e) {
      pushToast({
        message: resolveApiError(e, "Batch depreciation failed."),
        severity: "error",
      });
    } finally {
      setBatchPosting(false);
    }
  };

  const sourceLink = (row) => {
    if (row.source_type === "expense" && row.source_id) {
      return `${rolePrefix}/finance/expenses`;
    }
    if (row.import_batch_id) {
      return `${rolePrefix}/finance/fixed-assets/import`;
    }
    return null;
  };

  const toggleExpand = (assetId) => {
    setExpandedAssetId((current) => (current === assetId ? null : assetId));
  };

  const showGuidedEmpty = !loading && rows.length === 0;

  return (
    <>
      <FinancePanel>
        <FinancePanelHeader>
          <FinancePageHeader
            title="Fixed assets"
            subtitle="Sub-ledger of fixed-asset GL accounts. New purchases are recorded via expenses; legacy assets use opening-balance import. Depreciation for the current month auto-posts on the 1st; use the buttons below for manual or catch-up runs."
          />
        </FinancePanelHeader>

        {batchFilter ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ px: { xs: 2, sm: 3 }, pb: 1 }}
          >
            Filtered to import batch #{batchFilter}.{" "}
            <Link
              component={RouterLink}
              to={`${rolePrefix}/finance/fixed-assets`}
            >
              Clear filter
            </Link>
          </Typography>
        ) : null}

        <FinancePeriodToolbar
          embedded
          month={postingMonth}
          onMonthChange={setPostingMonth}
          periodLabel={formatMonthLabel(postingMonth)}
          periodSubLabel={monthRangeLabel(postingMonth)}
          stats={[
            {
              label: "Posted",
              value: registerDepreciationStats.postedForMonth,
              accent: "success.main",
            },
            {
              label: "Due",
              value: registerDepreciationStats.dueAssets,
              accent: "warning.main",
            },
            {
              label: "Behind",
              value: registerDepreciationStats.behindAssets,
              accent: "error.main",
            },
            {
              label: "Missing runs",
              value: registerDepreciationStats.totalDuePeriods,
            },
          ]}
        />

        {canManage ? (
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={0.75}
            flexWrap="wrap"
            sx={{ px: { xs: 2, sm: 3 }, py: 1 }}
          >
            <Button
              variant="contained"
              size="small"
              disabled={batchPosting || loading}
              onClick={() => void runBatchDepreciation(false)}
            >
              Post all for {formatMonthLabel(postingMonth)}
            </Button>
            {/* <Button
              variant="outlined"
              size="small"
              disabled={batchPosting || loading}
              onClick={() => void runBatchDepreciation(true)}
            >
              Catch up all through {formatMonthLabel(postingMonth)}
            </Button> */}
          </Stack>
        ) : null}

        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          spacing={1}
          sx={financeToolbarSx}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            flexWrap="wrap"
          >
            <Typography
              variant="subtitle2"
              fontWeight={700}
              sx={{ letterSpacing: "0.02em" }}
            >
              Register
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              {filteredRows.length} total
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} flexWrap="wrap">
            {canManage ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<CategoryOutlinedIcon />}
                onClick={() => setCategoriesOpen(true)}
              >
                Categories
              </Button>
            ) : null}
            {canImport && openingWindowOpen ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<UploadFileIcon />}
                component={RouterLink}
                to={`${rolePrefix}/finance/fixed-assets/import`}
              >
                Excel import
              </Button>
            ) : null}
            {canManage && openingWindowOpen && rows.length > 0 ? (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => void openImportDialog()}
              >
                Import Asset
              </Button>
            ) : null}
          </Stack>
        </Stack>

        <FinancePanelTable>
          {showGuidedEmpty ? (
            <GuidedEmptyState
              icon={PrecisionManufacturingOutlinedIcon}
              title="No fixed assets yet"
              description="Register clinic equipment and other capital items here. Import an opening balance or add assets so monthly depreciation can post to the ledger."
              steps={EMPTY_STEPS}
              primaryAction={
                canManage && openingWindowOpen
                  ? {
                      label: "Import Fixed Asset",
                      onClick: () => void openImportDialog(),
                      startIcon: <AddIcon />,
                    }
                  : null
              }
              footer={
                <>
                  Asset and depreciation accounts live in{" "}
                  <Typography
                    component={RouterLink}
                    to={`${rolePrefix}/finance/chart-of-accounts`}
                    variant="body2"
                    sx={{
                      color: "primary.main",
                      fontWeight: 600,
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    Financial Management → Chart of Accounts
                  </Typography>
                  .
                </>
              }
            />
          ) : loading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <LoadingIndicator size={80} />
            </Box>
          ) : (
            <Table size="small" sx={compactTableSx}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 32, px: 0.5 }} aria-label="Expand" />
                  <TableColumnFilterHeader
                    label="Code"
                    options={columnOptions.code ?? []}
                    selectedValues={getColumnSelectionArray("code")}
                    onApply={(values) => setColumnSelection("code", values)}
                    onClear={() => clearColumnSelection("code")}
                    cellSx={{ width: CODE_COL_WIDTH }}
                  />
                  <TableCell sx={{ width: NAME_COL_WIDTH }}>Name</TableCell>
                  <TableColumnFilterHeader
                    label="Category"
                    options={columnOptions.category ?? []}
                    selectedValues={getColumnSelectionArray("category")}
                    onApply={(values) => setColumnSelection("category", values)}
                    onClear={() => clearColumnSelection("category")}
                  />
                  <TableCell>In service</TableCell>
                  <TableColumnFilterHeader
                    label="Source"
                    options={columnOptions.source ?? []}
                    selectedValues={getColumnSelectionArray("source")}
                    onApply={(values) => setColumnSelection("source", values)}
                    onClear={() => clearColumnSelection("source")}
                  />
                  <TableColumnFilterHeader
                    label="Custodian"
                    options={columnOptions.custodian ?? []}
                    selectedValues={getColumnSelectionArray("custodian")}
                    onApply={(values) =>
                      setColumnSelection("custodian", values)
                    }
                    onClear={() => clearColumnSelection("custodian")}
                  />
                  <TableCell align="right">Cost / NBV</TableCell>
                  <TableCell>Depreciation</TableCell>
                  {canManage ? <TableCell align="right">Post</TableCell> : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={columnCount}
                      align="center"
                      sx={{ py: 3 }}
                    >
                      <Typography
                        color="text.secondary"
                        sx={{ fontSize: "0.8125rem" }}
                      >
                        {hasActiveColumnFilters
                          ? "No results match your filters."
                          : "No fixed assets in this register."}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((a) => {
                    const href = sourceLink(a);
                    const isExpanded = expandedAssetId === a.id;
                    const depSummary = depreciationListSummary(
                      a,
                      postingPeriod.period_year,
                      postingPeriod.period_month,
                    );
                    return (
                      <Fragment key={a.id}>
                        <TableRow
                          hover
                          onClick={() => toggleExpand(a.id)}
                          sx={{
                            cursor: "pointer",
                            "& .MuiTableCell-root": {
                              ...(isExpanded ? { borderBottom: 0 } : undefined),
                            },
                          }}
                        >
                          <TableCell sx={{ width: 32, px: 0.5 }}>
                            <IconButton
                              size="small"
                              aria-label={isExpanded ? "Collapse" : "Expand"}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(a.id);
                              }}
                              sx={{
                                p: 0.25,
                                transform: isExpanded
                                  ? "rotate(90deg)"
                                  : "none",
                                transition: "transform 0.15s",
                              }}
                            >
                              <ChevronRightIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </TableCell>
                          <TableCell
                            sx={{
                              width: CODE_COL_WIDTH,
                              maxWidth: CODE_COL_WIDTH,
                            }}
                          >
                            <Typography
                              component="span"
                              noWrap
                              sx={{
                                display: "block",
                                fontSize: "0.75rem",
                                fontFamily: "ui-monospace, monospace",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {a.asset_code}
                            </Typography>
                          </TableCell>
                          <TableCell
                            sx={{
                              width: NAME_COL_WIDTH,
                              maxWidth: NAME_COL_WIDTH,
                            }}
                          >
                            <Tooltip title={a.asset_name} placement="top-start">
                              <Typography
                                component="span"
                                noWrap
                                sx={{
                                  display: "block",
                                  fontSize: "0.8125rem",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {a.asset_name}
                              </Typography>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Typography
                              component="span"
                              noWrap
                              sx={{
                                display: "block",
                                maxWidth: 140,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                fontSize: "0.8125rem",
                              }}
                            >
                              {fixedAssetCategoryLabel(a)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {formatDate(a.in_service_date ?? a.purchase_date)}
                          </TableCell>
                          <TableCell>
                            {href ? (
                              <Link
                                component={RouterLink}
                                to={href}
                                underline="hover"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {fixedAssetSourceLabel(a)}
                              </Link>
                            ) : (
                              fixedAssetSourceLabel(a)
                            )}
                          </TableCell>
                          <TableCell>{fixedAssetCustodianLabel(a)}</TableCell>
                          <TableCell align="right">
                            <Typography
                              component="span"
                              sx={{
                                fontSize: "0.8125rem",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {formatKyats(Number(a.purchase_cost))}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {depSummary.selectedPosted ? (
                              <Typography
                                variant="caption"
                                sx={{ color: "success.main", fontWeight: 600 }}
                              >
                                Posted{" "}
                                {formatPeriod(
                                  postingPeriod.period_year,
                                  postingPeriod.period_month,
                                )}
                              </Typography>
                            ) : depSummary.dueCount > 1 ? (
                              <Typography
                                variant="caption"
                                sx={{ color: "error.main", fontWeight: 600 }}
                              >
                                {depSummary.dueCount} months due
                              </Typography>
                            ) : depSummary.lastLabel ? (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Through {depSummary.lastLabel}
                              </Typography>
                            ) : (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                Not posted
                              </Typography>
                            )}
                          </TableCell>
                          {canManage ? (
                            <TableCell align="right">
                              {depSummary.selectedPosted ? (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  Done
                                </Typography>
                              ) : depSummary.selectedDue ? (
                                <Button
                                  size="small"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void runDepreciation(a.id, {
                                      catchUp: false,
                                    });
                                  }}
                                >
                                  Post
                                </Button>
                              ) : (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  —
                                </Typography>
                              )}
                            </TableCell>
                          ) : null}
                        </TableRow>

                        {isExpanded ? (
                          <TableRow>
                            <TableCell
                              colSpan={columnCount}
                              sx={{ py: 0, px: 1, borderBottom: 0 }}
                            >
                              <FixedAssetDetailPanel
                                asset={a}
                                sourceHref={href}
                                canManage={canManage}
                                postingMonth={postingMonth}
                                onPostDepreciation={(assetId, options) =>
                                  void runDepreciation(assetId, options)
                                }
                              />
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </FinancePanelTable>
      </FinancePanel>

      <Dialog
        open={open}
        onClose={() => void requestCloseDialog()}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Import Fixed Asset</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Alert severity="info" variant="outlined">
              <Typography variant="body2" component="div">
                Register equipment the clinic <strong>already owned</strong>{" "}
                before go-live. Enter only the current{" "}
                <strong>net book value</strong> and{" "}
                <strong>remaining useful life</strong>. Old purchase history is
                not needed — the system treats NBV as deemed cost and
                depreciates from cutover forward.
              </Typography>
              <Typography variant="body2" component="div" sx={{ mt: 1 }}>
                No purchase journal entry is posted. Monthly depreciation after
                go-live credits the category&apos;s accumulated-depreciation
                contra account. For{" "}
                <strong>new purchases after go-live</strong>, record an expense
                with <strong>Register as fixed asset</strong> (full cost).
              </Typography>
            </Alert>
            <FixedAssetRegistrationForm
              form={form}
              onChange={setForm}
              categories={categories}
              mode="opening_balance"
              suggestedCode={suggestedCode}
              suppliers={suppliers}
              users={staffUsers}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => void requestCloseDialog()} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={
              saving ||
              !form.asset_name ||
              !form.category_id ||
              !form.net_book_value ||
              !form.remaining_useful_months ||
              !form.opening_balance_date
            }
          >
            {saving ? <LoadingIndicator size={22} /> : "Import"}
          </Button>
        </DialogActions>
      </Dialog>

      <AssetCategoriesDialog
        open={categoriesOpen}
        onClose={() => setCategoriesOpen(false)}
        onCategoriesChange={() => void loadCategories()}
      />
    </>
  );
}
