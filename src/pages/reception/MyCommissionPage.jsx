import { useEffect, useState } from "react";
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
const emptyPagination = {
  current_page: 1,
  last_page: 1,
  total: 0,
  per_page: 20,
};

export default function MyCommissionPage() {
  const { pushToast } = useToastStore();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(emptyPagination);
  const [filters, setFilters] = useState({
    source_type: "",
    from_date: "",
    to_date: "",
  });

  const load = async (nextFilters = filters, nextPage = page) => {
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <Button variant="contained" onClick={() => load(filters, 1)}>
            Apply
          </Button>
        </Stack>
      </Paper>

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

      <Paper>
        {loading ? (
          <Box sx={{ p: 3 }}>
            <CircularProgress size={24} />
          </Box>
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
                    <TableCell>
                      {String(row.created_at || "").slice(0, 10)}
                    </TableCell>
                    <TableCell>{row.patient?.name || "-"}</TableCell>
                    <TableCell>{row.source_type}</TableCell>
                    <TableCell>{row.reason || "-"}</TableCell>
                    <TableCell align="right">
                      {formatMoney(row.commission_amount)}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Typography color="text.secondary">
                        No commission entries.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
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
              onChange={(_, value) => load(filters, value)}
              color="primary"
            />
          </Stack>
        )}
      </Paper>
    </Box>
  );
}
