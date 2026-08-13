import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  alpha,
  Box,
  Card,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import MedicationOutlinedIcon from "@mui/icons-material/MedicationOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import SearchIcon from "@mui/icons-material/Search";
import TodayOutlinedIcon from "@mui/icons-material/TodayOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import LocalPharmacyOutlinedIcon from "@mui/icons-material/LocalPharmacyOutlined";
import dayjs from "dayjs";
import { getPrescriptionsRegister } from "../../services/emrRegistryService";
import { resolveApiError } from "../../services/apiClient";
import useAuthStore from "../../stores/authStore";
import { getWorkspaceUrlPrefix } from "../../utils/workspaceRoutes";
import { formatPatientDateTime } from "../../utils/patientUtils";

function StatCard({ icon, label, value, tint }) {
  const theme = useTheme();
  const color = theme.palette[tint]?.main ?? theme.palette.primary.main;
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        flex: 1,
        minWidth: 150,
        borderRadius: 1,
        border: `1px solid ${alpha(color, 0.2)}`,
        background: `linear-gradient(135deg, ${alpha(color, 0.08)}, transparent 70%)`,
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            bgcolor: alpha(color, 0.14),
            color,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export default function PrescriptionsRegisterPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const prefix = getWorkspaceUrlPrefix(user);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPrescriptionsRegister();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(resolveApiError(err, "Could not load prescriptions."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.patient_name.toLowerCase().includes(q) ||
        String(r.patient_number).toLowerCase().includes(q) ||
        (r.medicines ?? "").toLowerCase().includes(q) ||
        (r.doctor_name ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const stats = useMemo(() => {
    const today = dayjs().format("YYYY-MM-DD");
    return {
      total: rows.length,
      today: rows.filter((r) => dayjs(r.date).format("YYYY-MM-DD") === today).length,
      dispensed: rows.filter((r) => r.dispensed).length,
      medicines: rows.reduce((sum, r) => sum + (r.item_count || 0), 0),
    };
  }, [rows]);

  return (
    <Box>
      <Stack
        direction={{ xs: "column", md: "row" }}
        alignItems={{ xs: "flex-start", md: "center" }}
        justifyContent="space-between"
        gap={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Prescriptions
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Prescriptions issued after consultation or treatment — searchable by
            patient, medicine or prescriber.
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 2.5 }}>
        <StatCard
          icon={<MedicationOutlinedIcon />}
          label="Total prescriptions"
          value={stats.total}
          tint="primary"
        />
        <StatCard
          icon={<TodayOutlinedIcon />}
          label="Today"
          value={stats.today}
          tint="info"
        />
        <StatCard
          icon={<LocalPharmacyOutlinedIcon />}
          label="Dispensed"
          value={stats.dispensed}
          tint="success"
        />
        <StatCard
          icon={<Inventory2OutlinedIcon />}
          label="Medicine lines"
          value={stats.medicines}
          tint="secondary"
        />
      </Stack>

      <Paper elevation={0} sx={{ p: { xs: 1.5, sm: 2 }, mb: 2, border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}` }}>
        <TextField
          size="small"
          placeholder="Search patient, medicine, prescriber…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: "100%", sm: 360 } }}
        />
      </Paper>

      <Card elevation={0} sx={{ overflow: "hidden" }}>
        <TableContainer>
          <Table size="medium" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Patient</TableCell>
                <TableCell>Prescriber</TableCell>
                <TableCell>Medicines</TableCell>
                <TableCell align="center">Items</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right" sx={{ width: 72 }}>
                  Open
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 6 }}>
                    <Typography color="error" align="center">
                      {error}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 8 }}>
                    <Stack alignItems="center" spacing={1.5}>
                      <MedicationOutlinedIcon color="disabled" sx={{ fontSize: 40 }} />
                      <Typography color="text.secondary" align="center">
                        No prescriptions match your search.
                      </Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => (
                  <TableRow
                    key={row.id}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => navigate(`${prefix}/patients/${row.patient_id}`)}
                  >
                    <TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>
                      {formatPatientDateTime(row.date)}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontWeight: 600 }}>
                        {row.patient_name}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ fontFamily: "ui-monospace, monospace", color: "primary.main" }}
                      >
                        {row.patient_number}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {row.doctor_name}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Typography variant="body2" noWrap title={row.medicines}>
                        {row.medicines || "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">{row.item_count}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.dispensed ? "Dispensed" : "Pending"}
                        color={row.dispensed ? "success" : "warning"}
                        variant={row.dispensed ? "filled" : "outlined"}
                      />
                    </TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Open consultation record">
                        <IconButton
                          size="small"
                          onClick={() =>
                            navigate(`${prefix}/visits/${row.visit_id}/consultation-room`)
                          }
                        >
                          <OpenInNewOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
