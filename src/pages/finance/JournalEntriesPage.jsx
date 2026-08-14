import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import dayjs from "dayjs";
import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import useAuthStore from "../../stores/authStore";
import useToastStore from "../../stores/toastStore";
import { hasPermission, hasRole } from "../../utils/accessUtils";
import { formatKyats } from "../../utils/formatKyats";
import { resolveApiError } from "../../services/apiClient";
import {
  createManualJournalEntry,
  listChartOfAccounts,
  listJournalEntries,
  reverseJournalEntry,
  syncManualJournalEntryLines,
  voidJournalTransactionLine,
} from "../../services/financeService";
import {
  formatCommaAmountFromNumber,
  parseCommaAmount,
  sanitizeCommaAmountInput,
} from "../../utils/amountInputUtils";
import {
  ENTRY_TYPE_FILTER_OPTIONS,
  journalEntryCategoryLabel,
} from "../../utils/journalEntryCategory";
import {
  FinanceCreditCell,
  FinanceDebitCell,
  FinancePageHeader,
  FinancePanel,
  FinancePanelHeader,
  FinancePanelTable,
  FinancePeriodToolbar,
  FinanceRowActions,
  formatMonthLabel,
  monthRangeLabel,
  monthToDateRange,
  useFinanceTokens,
} from "../../components/finance";
import JournalEntrySourceDetails, {
  rolePrefixFromPathname,
} from "../../components/finance/JournalEntrySourceDetails";

const defaultMonth = dayjs().format("YYYY-MM");

const emptyTypeFilters = {
  entry_category: "",
  query: "",
};

const JOURNAL_COLUMNS = [
  { id: "no", label: "No.", width: 48 },
  { id: "journal_no", label: "JR No.", width: 130 },
  { id: "date", label: "Date", width: 100 },
  { id: "type", label: "Type", width: 88 },
  { id: "description", label: "Description" },
  { id: "amount", label: "Amount", align: "right", width: 110 },
  { id: "source", label: "Source", width: 72 },
];

function formatHumanDate(value) {
  if (!value) return "—";
  return dayjs(value).format("DD-MM-YYYY");
}

function emptyManualLine() {
  return {
    account_id: "",
    debit: "",
    credit: "",
    description: "",
  };
}

function emptyManualForm() {
  return {
    journal_date: dayjs().format("YYYY-MM-DD"),
    memo: "",
    lines: [emptyManualLine(), emptyManualLine()],
  };
}

function lineToDraft(line) {
  return {
    account_id: String(line.account?.id ?? ""),
    debit:
      Number(line.debit) > 0 ? formatCommaAmountFromNumber(line.debit) : "",
    credit:
      Number(line.credit) > 0 ? formatCommaAmountFromNumber(line.credit) : "",
    description: line.description ?? "",
  };
}

function sumManualLines(lines) {
  let debit = 0;
  let credit = 0;
  for (const line of lines) {
    debit += parseCommaAmount(line.debit) || 0;
    credit += parseCommaAmount(line.credit) || 0;
  }
  return { debit, credit };
}

function journalEntryKey(entry, index) {
  return entry?.journal_entry_id ?? entry?.id ?? `row-${index}`;
}

function categoryTextColor(category, theme) {
  switch (category) {
    case "income":
      return theme.palette.success.main;
    case "expense":
      return theme.palette.warning.main;
    case "transfer":
      return theme.palette.info.main;
    default:
      return theme.palette.text.secondary;
  }
}

export default function JournalEntriesPage() {
  const theme = useTheme();
  const location = useLocation();
  const rolePrefix = rolePrefixFromPathname(location.pathname);
  const { user } = useAuthStore();
  const { pushToast } = useToastStore();
  const {
    financeToolbarSx,
    financeFilterStripSx,
    compactTableSx,
    compactFieldSx,
    journalLinesTableSx,
  } = useFinanceTokens();

  const canEditRows =
    hasRole(user, "owner") ||
    hasPermission(user, "finance.chart_of_accounts.manage");

  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appliedMonth, setAppliedMonth] = useState(defaultMonth);
  const [draftTypeFilters, setDraftTypeFilters] = useState(emptyTypeFilters);
  const [appliedTypeFilters, setAppliedTypeFilters] =
    useState(emptyTypeFilters);
  const [accounts, setAccounts] = useState([]);
  const [expandedEntryId, setExpandedEntryId] = useState(null);
  const [voidingByRow, setVoidingByRow] = useState({});
  const [manualOpen, setManualOpen] = useState(false);
  const [manualForm, setManualForm] = useState(emptyManualForm);
  const [creatingManual, setCreatingManual] = useState(false);
  const [reversingByEntry, setReversingByEntry] = useState({});
  const [editOpen, setEditOpen] = useState(false);
  const [editEntryId, setEditEntryId] = useState(null);
  const [editForm, setEditForm] = useState(emptyManualForm);
  const [savingEdit, setSavingEdit] = useState(false);

  const monthRange = useMemo(
    () => monthToDateRange(appliedMonth),
    [appliedMonth],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...monthRange,
        per_page: 200,
      };
      if (appliedTypeFilters.entry_category) {
        params.entry_category = appliedTypeFilters.entry_category;
      }
      if (String(appliedTypeFilters.query ?? "").trim()) {
        params.query = appliedTypeFilters.query.trim();
      }
      const data = await listJournalEntries(params);
      setEntries(Array.isArray(data?.data) ? data.data : []);
      setSummary(data?.meta?.summary ?? null);
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Failed to load journal entries."),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [monthRange, appliedTypeFilters, pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const data = await listChartOfAccounts({ is_active: true });
        setAccounts(Array.isArray(data) ? data : []);
      } catch {
        setAccounts([]);
      }
    })();
  }, []);

  const accountOptions = useMemo(
    () =>
      [...accounts].sort((a, b) =>
        `${a.code ?? ""} ${a.name ?? ""}`.localeCompare(
          `${b.code ?? ""} ${b.name ?? ""}`,
        ),
      ),
    [accounts],
  );

  const manualBalance = useMemo(
    () => sumManualLines(manualForm.lines),
    [manualForm.lines],
  );

  const handleMonthChange = (nextMonth) => {
    setAppliedMonth(nextMonth);
    setExpandedEntryId(null);
  };

  const applyTypeFilters = () => {
    setAppliedTypeFilters({ ...draftTypeFilters });
    setExpandedEntryId(null);
  };

  const clearTypeFilters = () => {
    setDraftTypeFilters(emptyTypeFilters);
    setAppliedTypeFilters(emptyTypeFilters);
    setExpandedEntryId(null);
  };

  const toggleExpand = (entryId) => {
    setExpandedEntryId((prev) => (prev === entryId ? null : entryId));
  };

  const openEditManualEntry = (entry) => {
    const activeLines = (entry.lines ?? []).filter((line) => !line.voided_at);
    setEditEntryId(entry.journal_entry_id);
    setEditForm({
      journal_date: entry.journal_date ?? dayjs().format("YYYY-MM-DD"),
      memo: entry.memo ?? "",
      lines: activeLines.map((line) => lineToDraft(line)),
    });
    setEditOpen(true);
  };

  const reverseEntry = async (entry) => {
    if (
      !window.confirm(
        `Reverse journal ${entry.journal_no}? The billing will unlock for re-post on Transactions.`,
      )
    ) {
      return;
    }
    setReversingByEntry((prev) => ({
      ...prev,
      [entry.journal_entry_id]: true,
    }));
    try {
      await reverseJournalEntry(entry.journal_entry_id);
      pushToast({ message: "Journal entry reversed.", severity: "success" });
      load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Unable to reverse journal entry."),
        severity: "error",
      });
    } finally {
      setReversingByEntry((prev) => ({
        ...prev,
        [entry.journal_entry_id]: false,
      }));
    }
  };

  const submitEditManualEntry = async () => {
    const entry = entries.find((item) => item.journal_entry_id === editEntryId);
    const entryLines = (entry?.lines ?? []).filter((line) => !line.voided_at);
    const payload = {
      journal_date: editForm.journal_date,
      memo: editForm.memo.trim() || null,
      lines: entryLines.map((item, index) => ({
        id: item.id,
        account_id: Number(editForm.lines[index]?.account_id),
        debit: parseCommaAmount(editForm.lines[index]?.debit) || 0,
        credit: parseCommaAmount(editForm.lines[index]?.credit) || 0,
        description: editForm.lines[index]?.description?.trim() || null,
      })),
    };

    if (payload.lines.some((line) => !line.account_id)) {
      pushToast({
        message: "Select an account for each line.",
        severity: "warning",
      });
      return;
    }

    const { debit, credit } = sumManualLines(editForm.lines);
    if (Math.abs(debit - credit) > 0.009) {
      pushToast({
        message: "Debits and credits must balance.",
        severity: "warning",
      });
      return;
    }

    setSavingEdit(true);
    try {
      await syncManualJournalEntryLines(editEntryId, payload);
      setEditOpen(false);
      pushToast({ message: "Journal entry updated.", severity: "success" });
      load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Unable to update journal entry."),
        severity: "error",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const setEditLine = (index, patch) => {
    setEditForm((prev) => {
      const lines = [...prev.lines];
      lines[index] = { ...lines[index], ...patch };
      return { ...prev, lines };
    });
  };

  const voidRow = async (line) => {
    if (line.voided_at) return;
    if (
      !window.confirm(`Void journal line #${line.id}? This cannot be undone.`)
    ) {
      return;
    }
    setVoidingByRow((prev) => ({ ...prev, [line.id]: true }));
    try {
      await voidJournalTransactionLine(line.id);
      pushToast({ message: "Transaction row voided.", severity: "success" });
      load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Unable to void transaction row."),
        severity: "error",
      });
    } finally {
      setVoidingByRow((prev) => ({ ...prev, [line.id]: false }));
    }
  };

  const setManualLine = (index, patch) => {
    setManualForm((prev) => {
      const lines = [...prev.lines];
      lines[index] = { ...lines[index], ...patch };
      return { ...prev, lines };
    });
  };

  const addManualLine = () => {
    setManualForm((prev) => ({
      ...prev,
      lines: [...prev.lines, emptyManualLine()],
    }));
  };

  const removeManualLine = (index) => {
    setManualForm((prev) => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const submitManualEntry = async () => {
    const lines = manualForm.lines.map((line) => ({
      account_id: Number(line.account_id),
      debit: parseCommaAmount(line.debit) || 0,
      credit: parseCommaAmount(line.credit) || 0,
      description: line.description?.trim() || null,
    }));

    if (lines.some((line) => !line.account_id)) {
      pushToast({
        message: "Select an account for each line.",
        severity: "warning",
      });
      return;
    }
    if (lines.some((line) => line.debit > 0 && line.credit > 0)) {
      pushToast({
        message: "Each line must be debit or credit, not both.",
        severity: "warning",
      });
      return;
    }
    if (lines.some((line) => line.debit <= 0 && line.credit <= 0)) {
      pushToast({
        message: "Enter amounts on every line.",
        severity: "warning",
      });
      return;
    }

    const { debit, credit } = sumManualLines(manualForm.lines);
    if (Math.abs(debit - credit) > 0.009) {
      pushToast({
        message: "Debits and credits must balance before posting.",
        severity: "warning",
      });
      return;
    }

    setCreatingManual(true);
    try {
      await createManualJournalEntry({
        journal_date: manualForm.journal_date,
        memo: manualForm.memo.trim() || null,
        lines,
      });
      setManualOpen(false);
      setManualForm(emptyManualForm());
      pushToast({
        message: "Manual journal entry posted.",
        severity: "success",
      });
      load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Unable to post manual journal entry."),
        severity: "error",
      });
    } finally {
      setCreatingManual(false);
    }
  };

  const stats = summary ?? {
    entries: 0,
    total_debit: 0,
    income: 0,
    expense: 0,
    transfer: 0,
    manual: 0,
    auto: 0,
  };

  return (
    <>
      <FinancePanel>
        <FinancePanelHeader>
          <FinancePageHeader
            title="Journal entries"
            subtitle="Posted journals by month with expandable debit and credit detail."
            guide={[
              "Every financial event is recorded as a balanced journal entry — total debits equal total credits.",
              "Expand a row to see which accounts were debited and credited.",
              "Most entries are posted automatically from invoices, expenses and payroll; you can also add a manual entry.",
            ]}
          />
          {!canEditRows ? (
            <Alert severity="info" sx={{ mt: 1.5, py: 0.75, fontSize: "0.8125rem" }}>
              Read-only. Owner or accounting managers can post, edit, or void lines.
            </Alert>
          ) : null}
        </FinancePanelHeader>

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
              Journal register
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontWeight: 500 }}
            >
              {stats.entries} {stats.entries === 1 ? "entry" : "entries"}
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
            {canEditRows ? (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon sx={{ fontSize: "1rem !important" }} />}
                onClick={() => {
                  setManualForm(emptyManualForm());
                  setManualOpen(true);
                }}
              >
                New entry
              </Button>
            ) : null}
          </Stack>
        </Stack>

        <FinancePeriodToolbar
          embedded
          month={appliedMonth}
          onMonthChange={handleMonthChange}
          periodLabel={formatMonthLabel(appliedMonth)}
          periodSubLabel={monthRangeLabel(appliedMonth)}
          stats={[
            { label: "Entries", value: stats.entries },
            {
              label: "Total debits",
              value: formatKyats(stats.total_debit),
              accent: "info.main",
            },
            {
              label: "Income",
              value: stats.income,
              accent: "success.main",
            },
            {
              label: "Expense",
              value: stats.expense,
              accent: "warning.main",
            },
            { label: "Transfer", value: stats.transfer, accent: "info.main" },
            { label: "Manual", value: stats.manual },
            { label: "Auto", value: stats.auto },
          ]}
        />

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1.5}
          useFlexGap
          flexWrap="wrap"
          alignItems={{ md: "flex-end" }}
          sx={{
            ...financeFilterStripSx,
            py: 2,
            borderTop: 0,
          }}
        >
          <TextField
            select
            size="small"
            label="Entry type"
            value={draftTypeFilters.entry_category}
            onChange={(e) =>
              setDraftTypeFilters((prev) => ({
                ...prev,
                entry_category: e.target.value,
              }))
            }
            sx={{ ...compactFieldSx, minWidth: 160 }}
          >
            {ENTRY_TYPE_FILTER_OPTIONS.map((item) => (
              <MenuItem key={item.value || "all"} value={item.value}>
                {item.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Search"
            placeholder="Journal no, memo"
            value={draftTypeFilters.query}
            onChange={(e) =>
              setDraftTypeFilters((prev) => ({
                ...prev,
                query: e.target.value,
              }))
            }
            sx={{ ...compactFieldSx, flex: 1, minWidth: 200 }}
          />
          <Stack direction="row" spacing={0.75}>
            <Button variant="contained" size="small" onClick={applyTypeFilters}>
              Apply
            </Button>
            <Button variant="outlined" size="small" onClick={clearTypeFilters}>
              Clear
            </Button>
          </Stack>
        </Stack>

        <FinancePanelTable>
            <Table size="small" sx={compactTableSx}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 36 }} />
                  {JOURNAL_COLUMNS.map((col) => (
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
                      colSpan={JOURNAL_COLUMNS.length + 1}
                      align="center"
                      sx={{ py: 4 }}
                    >
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : null}
                {!loading && entries.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={JOURNAL_COLUMNS.length + 1}
                      align="center"
                      sx={{ py: 3 }}
                    >
                      <Typography
                        color="text.secondary"
                        sx={{ fontSize: "0.8125rem" }}
                      >
                        No journal entries in this period.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : null}
                {!loading
                  ? entries.map((entry, index) => {
                      const entryKey = journalEntryKey(entry, index);
                      const isExpanded =
                        expandedEntryId != null && expandedEntryId === entryKey;
                      const category =
                        entry.entry_category_label ??
                        journalEntryCategoryLabel(entry.entry_category);
                      const typeColor = categoryTextColor(
                        entry.entry_category,
                        theme,
                      );

                      return (
                        <Fragment key={entryKey}>
                          <TableRow
                            hover
                            onClick={() => toggleExpand(entryKey)}
                            sx={{
                              cursor: "pointer",
                              opacity: entry.reversed_at ? 0.65 : 1,
                              "& .MuiTableCell-root": {
                                whiteSpace: "nowrap",
                                py: 0.75,
                                ...(isExpanded
                                  ? { borderBottom: 0 }
                                  : undefined),
                              },
                            }}
                          >
                            <TableCell sx={{ width: 36, px: 0.5 }}>
                              <IconButton
                                size="small"
                                aria-label={isExpanded ? "Collapse" : "Expand"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(entryKey);
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
                            <TableCell>{index + 1}</TableCell>
                            <TableCell>
                              <Typography
                                component="span"
                                sx={{ fontSize: "0.8125rem", fontWeight: 600 }}
                              >
                                {entry.journal_no ?? "—"}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {formatHumanDate(entry.journal_date)}
                            </TableCell>
                            <TableCell>
                              <Typography
                                component="span"
                                sx={{
                                  fontSize: "0.8125rem",
                                  fontWeight: 600,
                                  color: typeColor,
                                }}
                              >
                                {category}
                              </Typography>
                            </TableCell>
                            <TableCell
                              sx={{
                                maxWidth: 280,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              <Typography
                                component="span"
                                sx={{ fontSize: "0.8125rem" }}
                                noWrap
                              >
                                {entry.description ?? "—"}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography
                                component="span"
                                sx={{
                                  fontSize: "0.8125rem",
                                  fontWeight: 600,
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                {formatKyats(entry.amount ?? 0)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                component="span"
                                sx={{
                                  fontSize: "0.8125rem",
                                  fontWeight: 600,
                                  color: entry.is_manual
                                    ? "primary.main"
                                    : "text.secondary",
                                }}
                              >
                                {entry.source_label ??
                                  (entry.is_manual ? "Manual" : "Auto")}
                              </Typography>
                            </TableCell>
                          </TableRow>

                          {isExpanded ? (
                            <TableRow>
                              <TableCell
                                colSpan={JOURNAL_COLUMNS.length + 1}
                                sx={{ py: 0, px: 1.5, borderBottom: 0 }}
                              >
                                <Box
                                  sx={{
                                    py: 1.5,
                                    px: 2,
                                    mb: 0.5,
                                    borderRadius: 1,
                                    border: "1px solid",
                                    borderColor: "divider",
                                    bgcolor: "rgba(255,255,255,0.04)",
                                  }}
                                >
                                  <Stack
                                    direction={{ xs: "column", sm: "row" }}
                                    justifyContent="space-between"
                                    alignItems={{
                                      xs: "flex-start",
                                      sm: "center",
                                    }}
                                    spacing={1}
                                    mb={1.5}
                                  >
                                    <JournalEntrySourceDetails
                                      entry={entry}
                                      rolePrefix={rolePrefix}
                                      pathname={location.pathname}
                                      contextMonth={appliedMonth}
                                    />
                                    <Stack
                                      direction="row"
                                      spacing={0.75}
                                      flexWrap="wrap"
                                    >
                                      {canEditRows &&
                                      entry.can_edit &&
                                      !entry.reversed_at ? (
                                        <Button
                                          size="small"
                                          variant="outlined"
                                          onClick={() =>
                                            openEditManualEntry(entry)
                                          }
                                        >
                                          Edit entry
                                        </Button>
                                      ) : null}
                                      {canEditRows &&
                                      entry.can_reverse &&
                                      !entry.reversed_at ? (
                                        <Button
                                          size="small"
                                          color="warning"
                                          variant="outlined"
                                          disabled={
                                            reversingByEntry[
                                              entry.journal_entry_id
                                            ]
                                          }
                                          onClick={() => reverseEntry(entry)}
                                        >
                                          {reversingByEntry[
                                            entry.journal_entry_id
                                          ]
                                            ? "Reversing…"
                                            : "Reverse"}
                                        </Button>
                                      ) : null}
                                    </Stack>
                                  </Stack>

                                  <Table
                                    size="small"
                                    sx={{ ...compactTableSx, ...journalLinesTableSx }}
                                  >
                                    <TableHead>
                                      <TableRow>
                                        <TableCell>Account</TableCell>
                                        <TableCell>Description</TableCell>
                                        <TableCell
                                          align="right"
                                          className="journal-dr-header"
                                        >
                                          Debit (DR)
                                        </TableCell>
                                        <TableCell
                                          align="right"
                                          className="journal-cr-header"
                                        >
                                          Credit (CR)
                                        </TableCell>
                                        {canEditRows ? (
                                          <TableCell
                                            align="right"
                                            sx={{ width: 56 }}
                                          >
                                            {" "}
                                          </TableCell>
                                        ) : null}
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {(entry.lines ?? []).map((line) => (
                                        <TableRow
                                          key={line.id}
                                          sx={{
                                            opacity: line.voided_at ? 0.5 : 1,
                                          }}
                                        >
                                          <TableCell>
                                            {line.account
                                              ? `${line.account.code} · ${line.account.name}`
                                              : "—"}
                                          </TableCell>
                                          <TableCell sx={{ whiteSpace: "normal" }}>
                                            {line.description ?? "—"}
                                            {line.voided_at ? " (void)" : ""}
                                          </TableCell>
                                          <FinanceDebitCell
                                            value={line.debit}
                                          />
                                          <FinanceCreditCell
                                            value={line.credit}
                                          />
                                          {canEditRows ? (
                                            <TableCell align="right">
                                              {entry.is_manual &&
                                              !line.voided_at &&
                                              !entry.is_auto_posted ? (
                                                <FinanceRowActions
                                                  actions={[
                                                    {
                                                      variant: "void",
                                                      label: "Void line",
                                                      onClick: () =>
                                                        voidRow(line),
                                                      disabled:
                                                        voidingByRow[line.id],
                                                    },
                                                  ]}
                                                />
                                              ) : null}
                                            </TableCell>
                                          ) : null}
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </Box>
                              </TableCell>
                            </TableRow>
                          ) : null}
                        </Fragment>
                      );
                    })
                  : null}
              </TableBody>
            </Table>
        </FinancePanelTable>
      </FinancePanel>

      <Dialog
        open={manualOpen}
        onClose={() => !creatingManual && setManualOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>New manual journal entry</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                size="small"
                type="date"
                label="Journal date"
                value={manualForm.journal_date}
                onChange={(e) =>
                  setManualForm((prev) => ({
                    ...prev,
                    journal_date: e.target.value,
                  }))
                }
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                size="small"
                label="Memo"
                value={manualForm.memo}
                onChange={(e) =>
                  setManualForm((prev) => ({ ...prev, memo: e.target.value }))
                }
                fullWidth
              />
            </Stack>

            <Divider />

            {manualForm.lines.map((line, index) => (
              <Stack
                key={`manual-line-${index}`}
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                alignItems={{ md: "center" }}
              >
                <TextField
                  select
                  size="small"
                  label="Account"
                  value={line.account_id}
                  onChange={(e) =>
                    setManualLine(index, { account_id: e.target.value })
                  }
                  sx={{ flex: 2 }}
                >
                  {accountOptions.map((account) => (
                    <MenuItem key={account.id} value={String(account.id)}>
                      {account.name} - {account.code}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  label="Debit"
                  value={line.debit}
                  onChange={(e) =>
                    setManualLine(index, {
                      debit: sanitizeCommaAmountInput(e.target.value),
                      credit: "",
                    })
                  }
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label="Credit"
                  value={line.credit}
                  onChange={(e) =>
                    setManualLine(index, {
                      credit: sanitizeCommaAmountInput(e.target.value),
                      debit: "",
                    })
                  }
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label="Line note"
                  value={line.description}
                  onChange={(e) =>
                    setManualLine(index, { description: e.target.value })
                  }
                  sx={{ flex: 2 }}
                />
                <IconButton
                  aria-label="Remove line"
                  onClick={() => removeManualLine(index)}
                  disabled={manualForm.lines.length <= 2}
                >
                  <DeleteOutlineIcon />
                </IconButton>
              </Stack>
            ))}

            <Button
              startIcon={<AddIcon />}
              onClick={addManualLine}
              sx={{ alignSelf: "flex-start" }}
            >
              Add line
            </Button>

            <Alert
              severity={
                Math.abs(manualBalance.debit - manualBalance.credit) < 0.01
                  ? "success"
                  : "warning"
              }
            >
              Debits {formatKyats(manualBalance.debit)} · Credits{" "}
              {formatKyats(manualBalance.credit)}
              {Math.abs(manualBalance.debit - manualBalance.credit) < 0.01
                ? " (balanced)"
                : " (must balance to post)"}
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setManualOpen(false)}
            disabled={creatingManual}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitManualEntry}
            disabled={
              creatingManual ||
              Math.abs(manualBalance.debit - manualBalance.credit) > 0.009
            }
          >
            {creatingManual ? "Posting…" : "Post entry"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editOpen}
        onClose={() => !savingEdit && setEditOpen(false)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Edit manual journal entry</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                size="small"
                type="date"
                label="Journal date"
                value={editForm.journal_date}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    journal_date: e.target.value,
                  }))
                }
                slotProps={{ inputLabel: { shrink: true } }}
                fullWidth
              />
              <TextField
                size="small"
                label="Memo"
                value={editForm.memo}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, memo: e.target.value }))
                }
                fullWidth
              />
            </Stack>
            <Divider />
            {editForm.lines.map((line, index) => (
              <Stack
                key={`edit-line-${index}`}
                direction={{ xs: "column", md: "row" }}
                spacing={1}
                alignItems={{ md: "center" }}
              >
                <TextField
                  select
                  size="small"
                  label="Account"
                  value={line.account_id}
                  onChange={(e) =>
                    setEditLine(index, { account_id: e.target.value })
                  }
                  sx={{ flex: 2 }}
                >
                  {accountOptions.map((account) => (
                    <MenuItem key={account.id} value={String(account.id)}>
                      {account.code} · {account.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  label="Debit"
                  value={line.debit}
                  onChange={(e) =>
                    setEditLine(index, {
                      debit: sanitizeCommaAmountInput(e.target.value),
                      credit: "",
                    })
                  }
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label="Credit"
                  value={line.credit}
                  onChange={(e) =>
                    setEditLine(index, {
                      credit: sanitizeCommaAmountInput(e.target.value),
                      debit: "",
                    })
                  }
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label="Line note"
                  value={line.description}
                  onChange={(e) =>
                    setEditLine(index, { description: e.target.value })
                  }
                  sx={{ flex: 2 }}
                />
              </Stack>
            ))}
            <Alert
              severity={
                Math.abs(
                  sumManualLines(editForm.lines).debit -
                    sumManualLines(editForm.lines).credit,
                ) < 0.01
                  ? "success"
                  : "warning"
              }
            >
              Debits {formatKyats(sumManualLines(editForm.lines).debit)} ·
              Credits {formatKyats(sumManualLines(editForm.lines).credit)}
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)} disabled={savingEdit}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={submitEditManualEntry}
            disabled={savingEdit}
          >
            {savingEdit ? "Saving…" : "Save changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
