import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
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
} from "../../components/finance";
import {
  createChartOfAccount,
  listChartOfAccounts,
  updateChartOfAccount,
} from "../../services/financeService";
import useToastStore from "../../stores/toastStore";
import { resolveApiError } from "../../services/apiClient";
import { hasPermission } from "../../utils/accessUtils";
import useAuthStore from "../../stores/authStore";

const ACTIVE_OPTIONS = [
  { value: "", label: "All status" },
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

const COA_COLUMNS = [
  { id: "code", label: "Code", width: 100 },
  { id: "name", label: "Name" },
  { id: "memo", label: "Memo" },
  { id: "status", label: "Status", width: 100 },
  { id: "system", label: "System", width: 72 },
  { id: "actions", label: "", align: "right", width: 56 },
];

const emptyFilters = { query: "", type: "", is_active: "" };

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
  const [defaultType, setDefaultType] = useState("asset");

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
  }, [load]);

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
    () => visibleGroups.reduce((sum, g) => sum + (grouped[g.key]?.length ?? 0), 0),
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
        pushToast({ message: "Chart of account updated.", severity: "success" });
      } else {
        await createChartOfAccount(payload);
        pushToast({ message: "Chart of account created.", severity: "success" });
      }
      setDialogOpen(false);
      setEditingRow(null);
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Could not save chart of account."),
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const applyFilters = () => setFilters({ ...draftFilters });

  const clearFilters = () => {
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
  };

  if (!canView) {
    return (
      <Alert severity="warning">You do not have permission to view chart of accounts.</Alert>
    );
  }

  return (
    <FinancePanel>
      <FinancePanelHeader>
        <FinancePageHeader
          title="Chart of Accounts"
          subtitle="Account heads grouped by type for income and finance workflows."
          guide={[
            "The master list of account heads grouped into Assets, Liabilities, Equity, Income and Expenses.",
            "Every journal entry posts to one of these accounts — this is the backbone of the books.",
            "Add clinic-specific accounts as needed; system accounts can't be deleted.",
          ]}
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
              sx={{ letterSpacing: "0.02em" }}
            >
              Account list
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              {totalAccounts} total
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.75} flexWrap="wrap">
            <Button variant="outlined" size="small" onClick={load} disabled={loading}>
              Refresh
            </Button>
            {canManage ? (
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
                  <TableCell colSpan={COA_COLUMNS.length} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={24} />
                  </TableCell>
                </TableRow>
              ) : totalAccounts === 0 ? (
                <TableRow>
                  <TableCell colSpan={COA_COLUMNS.length} align="center" sx={{ py: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      No chart of account rows match your filters.
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
                            <TableCell
                              sx={{ fontFamily: "monospace", fontWeight: 600 }}
                            >
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
                                <Typography variant="body2" color="text.secondary">
                                  —
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <FinanceStatusLabel active={row.is_active} />
                            </TableCell>
                            <TableCell>{row.is_system ? "Yes" : "No"}</TableCell>
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
        </FinancePanelTable>

      <ChartOfAccountDialog
        key={`${dialogOpen ? "open" : "closed"}-${editingRow?.id ?? "new"}`}
        open={dialogOpen}
        onClose={() => {
          if (!saving) setDialogOpen(false);
        }}
        onSubmit={submitDialog}
        account={editingRow}
        submitting={saving}
        defaultType={defaultType}
      />
    </FinancePanel>
  );
}
