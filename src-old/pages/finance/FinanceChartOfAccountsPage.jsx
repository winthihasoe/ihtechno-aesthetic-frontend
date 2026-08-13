import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import AddIcon from "@mui/icons-material/Add";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import PostAddOutlinedIcon from "@mui/icons-material/PostAddOutlined";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import LoadingIndicator from "../../components/common/LoadingIndicator";
import GuidedEmptyState from "../../components/common/GuidedEmptyState";
import {
  COA_TYPE_GROUPS,
  COA_TYPE_FILTER_OPTIONS,
  ChartOfAccountDialog,
  FinancePageHeader,
  FinancePanel,
  FinancePanelHeader,
  FinancePanelTable,
  FinanceRowActions,
  FinanceStatusLabel,
  useFinanceTokens,
  financeCoaCodeCellSx,
} from "../../components/finance";
import {
  createChartOfAccount,
  getCoaOpeningBalanceSummary,
  listChartOfAccounts,
  postCoaOpeningBalance,
  updateChartOfAccount,
} from "../../services/financeService";
import useToastStore from "../../stores/toastStore";
import { resolveApiError } from "../../services/apiClient";
import { isFixedAssetRegisterManagedCode } from "../../utils/fixedAssetCoaCodes";
import { hasPermission } from "../../utils/accessUtils";
import useAuthStore from "../../stores/authStore";
import { rolePrefixFromPathname } from "../../utils/financeSourceNavigation";
import { formatKyats } from "../../utils/formatKyats";

const ACTIVE_OPTIONS = [
  { value: "", label: "All status" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const COA_COLUMNS = [
  { id: "code", label: "Code", width: 100 },
  { id: "name", label: "Name" },
  { id: "memo", label: "Memo" },
  { id: "opening_balance", label: "Opening bal.", width: 120 },
  { id: "status", label: "Status", width: 100 },
  { id: "system", label: "System", width: 72 },
  { id: "actions", label: "", align: "right", width: 56 },
];

const BALANCE_SHEET_TYPES = new Set(["asset", "liability", "equity"]);

const emptyFilters = { query: "", type: "", is_active: "" };

const EMPTY_STEPS = [
  {
    icon: AccountTreeOutlinedIcon,
    title: "Set up account heads",
    body: "Create asset, liability, equity, revenue, and expense accounts that match how your clinic records money.",
  },
  {
    icon: PostAddOutlinedIcon,
    title: "Add accounts by type",
    body: "Use a unique code and name for each head — journals, expenses, and fixed assets all reference this list.",
  },
  {
    icon: MenuBookOutlinedIcon,
    title: "Used across finance",
    body: "Posted transactions, manual journals, payroll, and reports all roll up to these accounts in the general ledger.",
  },
];

function CoaGroupHeaderRow({ group, count, canManage, onAdd, sx }) {
  return (
    <TableRow sx={sx}>
      <TableCell colSpan={COA_COLUMNS.length}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography
            sx={{
              fontSize: "0.8125rem",
              fontWeight: 700,
              letterSpacing: "0.03em",
            }}
          >
            {group.label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {count} account{count === 1 ? "" : "s"}
          </Typography>
          {canManage ? (
            <Button
              size="small"
              variant="text"
              startIcon={<AddIcon sx={{ fontSize: "1rem !important" }} />}
              onClick={onAdd}
              sx={{
                ml: "auto",
                minWidth: 0,
                fontSize: "0.75rem",
                py: 0.25,
                px: 0.75,
              }}
            >
              Add
            </Button>
          ) : null}
        </Stack>
      </TableCell>
    </TableRow>
  );
}

export default function FinanceChartOfAccountsPage() {
  const location = useLocation();
  const rolePrefix = rolePrefixFromPathname(location.pathname);
  const { user } = useAuthStore();
  const { pushToast } = useToastStore();
  const {
    financeToolbarSx,
    financeFilterStripSx,
    compactTableSx,
    coaGroupHeaderSx,
    compactFieldSx,
  } = useFinanceTokens();
  const canManage = hasPermission(user, "finance.chart_of_accounts.manage");
  const canView =
    hasPermission(user, "payments.view") ||
    hasPermission(user, "finance.chart_of_accounts.view");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [saving, setSaving] = useState(false);
  const [postingOpeningBalance, setPostingOpeningBalance] = useState(false);
  const [defaultType, setDefaultType] = useState("asset");
  const [openingSummary, setOpeningSummary] = useState(null);

  const loadSummary = useCallback(async () => {
    try {
      const data = await getCoaOpeningBalanceSummary();
      setOpeningSummary(data ?? null);
    } catch {
      setOpeningSummary(null);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listChartOfAccounts({
        query: filters.query.trim() || undefined,
        type: filters.type || undefined,
        is_active: filters.is_active || undefined,
      });
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not load chart of accounts."),
        severity: "error",
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pushToast]);

  useEffect(() => {
    load();
    loadSummary();
  }, [load, loadSummary]);

  const visibleGroups = useMemo(
    () =>
      COA_TYPE_GROUPS.filter(
        (group) => !filters.type || filters.type === group.key,
      ),
    [filters.type],
  );

  const grouped = useMemo(() => {
    const map = Object.fromEntries(COA_TYPE_GROUPS.map((g) => [g.key, []]));
    for (const row of rows) {
      if (map[row.type]) map[row.type].push(row);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => String(a.code).localeCompare(String(b.code)));
    }
    return map;
  }, [rows]);

  const totalAccounts = useMemo(
    () =>
      visibleGroups.reduce((sum, g) => sum + (grouped[g.key]?.length ?? 0), 0),
    [grouped, visibleGroups],
  );

  const openCreate = (type = "asset") => {
    setEditingRow(null);
    setDefaultType(type);
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditingRow(row);
    setDefaultType(row.type ?? "asset");
    setDialogOpen(true);
  };

  const submitDialog = async (payload) => {
    setSaving(true);
    try {
      if (editingRow?.id) {
        await updateChartOfAccount(editingRow.id, payload);
        pushToast({
          message: "Chart of account updated.",
          severity: "success",
        });
      } else {
        await createChartOfAccount(payload);
        pushToast({
          message: "Chart of account created.",
          severity: "success",
        });
      }
      setDialogOpen(false);
      setEditingRow(null);
      await load();
      await loadSummary();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not save chart of account."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const submitOpeningBalance = async (payload) => {
    if (!editingRow?.id) return;
    setPostingOpeningBalance(true);
    try {
      const result = await postCoaOpeningBalance(
        editingRow.id,
        payload,
        `coa-ob-${editingRow.id}-${payload.opening_balance_date}`,
      );
      const warnings = Array.isArray(result?.warnings) ? result.warnings : [];
      pushToast({
        message:
          warnings.length > 0
            ? `Opening balance posted. ${warnings[0]}`
            : "Opening balance posted to the ledger (offset against Opening Balance Equity).",
        severity: warnings.length > 0 ? "warning" : "success",
      });
      setDialogOpen(false);
      setEditingRow(null);
      await load();
      await loadSummary();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not post opening balance."),
        severity: "error",
      });
    } finally {
      setPostingOpeningBalance(false);
    }
  };

  const renderOpeningBalanceCell = (row) => {
    if (!BALANCE_SHEET_TYPES.has(row.type) || row.code === "30000") {
      return (
        <Typography variant="body2" color="text.secondary">
          —
        </Typography>
      );
    }
    if (isFixedAssetRegisterManagedCode(row.code)) {
      if (row.opening_balance_journal_entry_id) {
        return (
          <Typography variant="body2" color="success.main" fontWeight={600}>
            From register
          </Typography>
        );
      }
      return (
        <Typography variant="body2" color="text.secondary">
          From register
        </Typography>
      );
    }
    if (row.opening_balance_journal_entry_id) {
      return (
        <Typography variant="body2" color="success.main" fontWeight={600}>
          Posted
        </Typography>
      );
    }
    return (
      <Typography variant="body2" color="text.secondary">
        —
      </Typography>
    );
  };

  const applyFilters = () => setFilters({ ...draftFilters });

  const clearFilters = () => {
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
  };

  const hasActiveFilters = Boolean(
    filters.query?.trim() || filters.type || filters.is_active,
  );
  const showGuidedEmpty = !loading && rows.length === 0 && !hasActiveFilters;

  if (!canView) {
    return (
      <Alert severity="warning">
        You do not have permission to view chart of accounts.
      </Alert>
    );
  }

  return (
    <FinancePanel>
      <FinancePanelHeader>
        <FinancePageHeader
          title="Chart of Accounts"
          subtitle="Account heads grouped by type for income and finance workflows."
        />
      </FinancePanelHeader>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        spacing={1}
        sx={financeToolbarSx}
      >
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
          <Typography
            variant="subtitle2"
            fontWeight={700}
            sx={{ letterSpacing: "0.02em", color: "text.primary" }}
          >
            Account list
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 500 }}
          >
            {totalAccounts} total
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.75} flexWrap="wrap">
          <Button
            variant="outlined"
            size="small"
            onClick={load}
            disabled={loading}
          >
            Refresh
          </Button>
          {canManage && rows.length > 0 ? (
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => openCreate()}
            >
              Add account
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {openingSummary?.opening_balance_window_open ? (
        <Alert severity="info" sx={{ mx: 2, mt: 1 }}>
          COA opening-balance migration is open until{" "}
          {openingSummary.opening_balance_until ??
            "the configured cutover date"}
          . Opening Balance Equity (30000) balance:{" "}
          <Typography component="span" fontWeight={700}>
            {formatKyats(Number(openingSummary.obe_balance ?? 0))}
          </Typography>
          {Number(openingSummary.obe_balance ?? 0) === 0
            ? " — trial balance offset is clear."
            : " — enter remaining account balances until this nets to zero."}{" "}
          {openingSummary.posted_count != null ? (
            <>
              ({openingSummary.posted_count} posted
              {openingSummary.pending_leaf_count != null
                ? `, ${openingSummary.pending_leaf_count} leaf accounts pending`
                : ""}
              ).{" "}
            </>
          ) : null}
          <Typography
            component={RouterLink}
            to={`${rolePrefix}/finance/general-ledger`}
            variant="body2"
            sx={{
              color: "primary.main",
              fontWeight: 600,
              textDecoration: "none",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            View general ledger
          </Typography>
        </Alert>
      ) : null}

      {/* Filters — same panel, no separate card */}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        useFlexGap
        flexWrap="wrap"
        alignItems={{ md: "flex-end" }}
        sx={financeFilterStripSx}
      >
        <TextField
          label="Search name, code, or memo"
          value={draftFilters.query}
          onChange={(e) =>
            setDraftFilters((prev) => ({ ...prev, query: e.target.value }))
          }
          size="small"
          sx={{ ...compactFieldSx, flex: 1, minWidth: 200 }}
        />
        <TextField
          select
          label="Account type"
          value={draftFilters.type}
          onChange={(e) =>
            setDraftFilters((prev) => ({ ...prev, type: e.target.value }))
          }
          size="small"
          sx={{ ...compactFieldSx, minWidth: 160 }}
        >
          {COA_TYPE_FILTER_OPTIONS.map((item) => (
            <MenuItem key={item.value || "all"} value={item.value}>
              {item.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Status"
          value={draftFilters.is_active}
          onChange={(e) =>
            setDraftFilters((prev) => ({ ...prev, is_active: e.target.value }))
          }
          size="small"
          sx={{ ...compactFieldSx, minWidth: 140 }}
        >
          {ACTIVE_OPTIONS.map((item) => (
            <MenuItem key={item.value || "all"} value={item.value}>
              {item.label}
            </MenuItem>
          ))}
        </TextField>
        <Stack direction="row" spacing={0.75}>
          <Button variant="contained" size="small" onClick={applyFilters}>
            Apply
          </Button>
          <Button variant="outlined" size="small" onClick={clearFilters}>
            Clear
          </Button>
        </Stack>
      </Stack>

      <FinancePanelTable>
        {showGuidedEmpty ? (
          <GuidedEmptyState
            icon={AccountTreeOutlinedIcon}
            title="No chart of accounts yet"
            description="Account heads are the foundation for journals, expenses, fixed assets, and financial reports. Add your first accounts to start posting."
            steps={EMPTY_STEPS}
            primaryAction={
              canManage
                ? {
                    label: "Add first account",
                    onClick: () => openCreate(),
                    startIcon: <AddIcon />,
                  }
                : null
            }
            footer={
              canManage ? (
                <>
                  After setup, post activity from{" "}
                  <Typography
                    component={RouterLink}
                    to={`${rolePrefix}/finance/journal-entries`}
                    variant="body2"
                    sx={{
                      color: "primary.main",
                      fontWeight: 600,
                      textDecoration: "none",
                      "&:hover": { textDecoration: "underline" },
                    }}
                  >
                    Financial Management → Journal Entries
                  </Typography>
                  .
                </>
              ) : (
                "Chart of accounts is maintained by staff with chart-of-accounts manage access."
              )
            }
          />
        ) : (
          <Table size="small" sx={compactTableSx}>
            <TableHead>
              <TableRow>
                {COA_COLUMNS.map((col) => (
                  <TableCell
                    key={col.id}
                    align={col.align}
                    sx={col.width ? { width: col.width } : undefined}
                  >
                    {col.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={COA_COLUMNS.length}
                    align="center"
                    sx={{ py: 4 }}
                  >
                    <LoadingIndicator size={80} />
                  </TableCell>
                </TableRow>
              ) : totalAccounts === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={COA_COLUMNS.length}
                    align="center"
                    sx={{ py: 3 }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {hasActiveFilters
                        ? "No chart of account rows match your filters."
                        : "No accounts in this view."}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                visibleGroups.map((group) => {
                  const sectionRows = grouped[group.key] ?? [];

                  return (
                    <Fragment key={group.key}>
                      <CoaGroupHeaderRow
                        group={group}
                        count={sectionRows.length}
                        canManage={canManage}
                        onAdd={() => openCreate(group.key)}
                        sx={coaGroupHeaderSx}
                      />
                      {sectionRows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={COA_COLUMNS.length}
                            sx={{
                              py: 1,
                              pl: 2.5,
                              fontStyle: "italic",
                              color: "text.secondary",
                              fontSize: "0.75rem",
                            }}
                          >
                            No {group.label.toLowerCase()} accounts
                          </TableCell>
                        </TableRow>
                      ) : (
                        sectionRows.map((row) => (
                          <TableRow key={row.id} hover>
                            <TableCell sx={financeCoaCodeCellSx}>
                              {row.code}
                            </TableCell>
                            <TableCell>{row.name}</TableCell>
                            <TableCell sx={{ maxWidth: 280 }}>
                              {row.memo ? (
                                <Tooltip title={row.memo}>
                                  <Typography variant="body2" noWrap>
                                    {row.memo}
                                  </Typography>
                                </Tooltip>
                              ) : (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  —
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              {renderOpeningBalanceCell(row)}
                            </TableCell>
                            <TableCell>
                              <FinanceStatusLabel active={row.is_active} />
                            </TableCell>
                            <TableCell>
                              {row.is_system ? "Yes" : "No"}
                            </TableCell>
                            <TableCell align="right">
                              {canManage ? (
                                <FinanceRowActions
                                  actions={[
                                    {
                                      variant: "edit",
                                      onClick: () => openEdit(row),
                                    },
                                  ]}
                                />
                              ) : null}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        )}
      </FinancePanelTable>

      <ChartOfAccountDialog
        key={`${dialogOpen ? "open" : "closed"}-${editingRow?.id ?? "new"}`}
        open={dialogOpen}
        onClose={() => {
          if (!saving && !postingOpeningBalance) setDialogOpen(false);
        }}
        onSubmit={submitDialog}
        onPostOpeningBalance={submitOpeningBalance}
        account={editingRow}
        submitting={saving}
        postingOpeningBalance={postingOpeningBalance}
        defaultType={defaultType}
        openingBalanceWindowOpen={Boolean(
          openingSummary?.opening_balance_window_open,
        )}
        defaultOpeningDate={openingSummary?.opening_balance_until ?? ""}
        rolePrefix={rolePrefix}
      />
    </FinancePanel>
  );
}
