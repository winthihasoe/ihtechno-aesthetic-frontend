import { useEffect, useMemo, useState } from "react";
import PercentOutlinedIcon from "@mui/icons-material/PercentOutlined";
import {
  Box,
  Typography,
  Paper,
  Stack,
  TextField,
  MenuItem,
  Button,
  Pagination,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  CircularProgress,
  TableContainer,
} from "@mui/material";
import {
  getMyCommissions,
  getMyCommissionSummary,
} from "../../services/commissionService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import { formatKyats } from "../../utils/formatKyats";

const formatMoney = (value) => formatKyats(Number(value || 0));
const emptyFilters = {
  source_type: "",
  from_date: "",
  to_date: "",
};
const emptyPagination = {
  current_page: 1,
  last_page: 1,
  total: 0,
  per_page: 20,
};
const sourceLabel = (sourceType) => {
  const labels = {
    manual: "Manual",
    treatment: "Treatment",
    package_purchase: "Package purchase",
  };
  return labels[sourceType] || sourceType || "-";
};
const formatDate = (value) => {
  if (!value) return "-";
  return String(value).slice(0, 10);
};

export default function MyCommissionPage() {
  const { pushToast } = useToastStore();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(emptyPagination);
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);

  const activeFilterCount = useMemo(
    () => Object.values(appliedFilters).filter(Boolean).length,
    [appliedFilters],
  );
  const hasActiveFilters = activeFilterCount > 0;
  const showFullEmptyState = !loading && pagination.total === 0 && !hasActiveFilters;
  const showFilteredEmptyState = !loading && rows.length === 0 && hasActiveFilters;

  const load = async (nextFilters = appliedFilters, nextPage = page) => {
    setLoading(true);
    try {
      const [entries, summaryRows] = await Promise.all([
        getMyCommissions({ ...nextFilters, page: nextPage }),
        getMyCommissionSummary(nextFilters),
      ]);
      const entryRows = Array.isArray(entries?.data)
        ? entries.data
        : Array.isArray(entries)
          ? entries
          : [];
      setRows(entryRows);
      setPagination({
        current_page: Number(entries?.current_page || nextPage),
        last_page: Number(entries?.last_page || 1),
        total: Number(entries?.total || entryRows.length),
        per_page: Number(entries?.per_page || 20),
      });
      setPage(Number(entries?.current_page || nextPage));
      setAppliedFilters(nextFilters);
      const summary = Array.isArray(summaryRows) ? summaryRows[0] : null;
      setTotal(Number(summary?.total_commission || 0));
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Failed to load your commissions."),
        severity: "error",
      });
      setRows([]);
      setTotal(0);
      setPagination(emptyPagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(emptyFilters, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => {
    setPage(1);
    load(filters, 1);
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setPage(1);
    load(emptyFilters, 1);
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        My commission
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            select
            size="small"
            label="Source"
            value={filters.source_type}
            onChange={(e) =>
              setFilters((f) => ({ ...f, source_type: e.target.value }))
            }
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All</MenuItem>
            <MenuItem value="treatment">Treatment</MenuItem>
            <MenuItem value="package_purchase">Package purchase</MenuItem>
          </TextField>
          <TextField
            size="small"
            type="date"
            label="From"
            InputLabelProps={{ shrink: true }}
            value={filters.from_date}
            onChange={(e) =>
              setFilters((f) => ({ ...f, from_date: e.target.value }))
            }
          />
          <TextField
            size="small"
            type="date"
            label="To"
            InputLabelProps={{ shrink: true }}
            value={filters.to_date}
            onChange={(e) =>
              setFilters((f) => ({ ...f, to_date: e.target.value }))
            }
          />
          <Button variant="contained" onClick={applyFilters}>
            Apply
          </Button>
        </Stack>
      </Paper>

      {!showFullEmptyState ? (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Total commission
          </Typography>
          {loading ? (
            <CircularProgress size={22} />
          ) : (
            <Typography variant="body1">{formatMoney(total)}</Typography>
          )}
        </Paper>
      ) : null}

      {showFullEmptyState ? (
        <MyCommissionEmptyState />
      ) : (
        <Paper variant="outlined">
          {loading ? (
            <Box sx={{ p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : showFilteredEmptyState ? (
            <MyCommissionFilteredEmptyState onClearFilters={clearFilters} />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Patient</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell align="right">Amount</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatDate(row.created_at)}</TableCell>
                      <TableCell>{row.patient?.name || "-"}</TableCell>
                      <TableCell>{sourceLabel(row.source_type)}</TableCell>
                      <TableCell>{row.reason || "-"}</TableCell>
                      <TableCell align="right">
                        {formatMoney(row.commission_amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
          {!loading && pagination.last_page > 1 && (
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", sm: "center" }}
              spacing={1}
              sx={{ p: 2 }}
            >
              <Typography variant="body2" color="text.secondary">
                Showing {rows.length} of {pagination.total} entries.
              </Typography>
              <Pagination
                count={pagination.last_page}
                page={page}
                onChange={(_, value) => load(appliedFilters, value)}
                color="primary"
              />
            </Stack>
          )}
        </Paper>
      )}
    </Box>
  );
}

function MyCommissionEmptyState() {
  return (
    <Box
      sx={{
        p: { xs: 2.5, sm: 3 },
        textAlign: "center",
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <PercentOutlinedIcon
        sx={{ fontSize: 48, color: "text.secondary", mb: 1 }}
      />
      <Typography variant="h6" fontWeight={700} gutterBottom>
        No commission entries yet
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 480, mx: "auto", mb: 2 }}
      >
        This page shows commission you have earned from treatments and package
        sales. Totals are included in your monthly payslip after HR finalizes
        payroll.
      </Typography>
      <Stack
        spacing={0.75}
        sx={{
          maxWidth: 440,
          mx: "auto",
          textAlign: "left",
          mb: 2,
          px: 1,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          <strong>Treatment:</strong> Commission from completed treatments you
          performed or assisted.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Packages:</strong> Commission when patients purchase packages
          linked to your role.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Payslip:</strong> Earned amounts appear on your payslip once
          HR runs and finalizes payroll for that month.
        </Typography>
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block">
        Entries appear here after eligible treatments or package sales are
        recorded.
      </Typography>
    </Box>
  );
}

function MyCommissionFilteredEmptyState({ onClearFilters }) {
  return (
    <Box sx={{ p: 2.5, bgcolor: "action.hover" }}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        No records match these filters
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Try a different source or date range, or clear filters to see all of
        your commission entries.
      </Typography>
      <Button size="small" variant="outlined" onClick={onClearFilters}>
        Clear filters
      </Button>
    </Box>
  );
}
