import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  alpha,
  Alert,
  AlertTitle,
  Box,
  Card,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";
import dayjs from "dayjs";
import ReplayCircleFilledIcon from "@mui/icons-material/ReplayCircleFilled";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import { getInventoryAlerts } from "./inventoryService";
import { resolveApiError } from "../../services/apiClient";
import useAuthStore from "../../stores/authStore";
import { getWorkspaceUrlPrefix } from "../../utils/workspaceRoutes";

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
        border: `1px solid ${alpha(color, 0.25)}`,
        background: `linear-gradient(135deg, ${alpha(color, 0.1)}, transparent 70%)`,
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
            bgcolor: alpha(color, 0.16),
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

function SectionCard({ title, icon, color, children }) {
  return (
    <Card variant="outlined" sx={{ overflow: "hidden" }}>
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" }}
      >
        <Box sx={{ color, display: "flex" }}>{icon}</Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
      </Stack>
      {children}
    </Card>
  );
}

export default function StockAlertsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const prefix = getWorkspaceUrlPrefix(user);

  const [alerts, setAlerts] = useState({
    low_stock: [],
    expiring_soon: [],
    expired: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getInventoryAlerts({ days: 90 });
      setAlerts({
        low_stock: data?.low_stock ?? [],
        expiring_soon: data?.expiring_soon ?? [],
        expired: data?.expired ?? [],
      });
    } catch (err) {
      setError(resolveApiError(err, "Could not load stock alerts."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const outCount = useMemo(
    () => alerts.low_stock.filter((r) => r.stock_status === "out").length,
    [alerts.low_stock],
  );

  const openProduct = (productId) => {
    if (productId) navigate(`${prefix}/inventory/${productId}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h5" fontWeight={700}>
          Stock Alerts
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          The daily action list for your store — items to reorder and batches to
          pull before they expire.
        </Typography>
      </Box>

      <Alert severity="info" icon={false} sx={{ mb: 2.5, borderRadius: 2 }}>
        <AlertTitle sx={{ fontWeight: 700 }}>How to use this page</AlertTitle>
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          <li>
            <strong>Reorder list</strong> — products at or below their minimum
            level (or out of stock). Raise a purchase order from{" "}
            <em>Inventory Receiving</em>.
          </li>
          <li>
            <strong>Expiring soon</strong> — batches within 90 days of expiry.
            Prioritise dispensing these (first-expiry-first-out).
          </li>
          <li>
            <strong>Expired</strong> — quarantine and dispose, then record a
            stock adjustment so on-hand quantity stays accurate.
          </li>
          <li>Click any row to open the product and review its batches.</li>
        </Box>
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 3 }}>
        <StatCard
          icon={<ReplayCircleFilledIcon />}
          label="To reorder"
          value={alerts.low_stock.length}
          tint="warning"
        />
        <StatCard
          icon={<Inventory2OutlinedIcon />}
          label="Out of stock"
          value={outCount}
          tint="error"
        />
        <StatCard
          icon={<EventBusyOutlinedIcon />}
          label="Expiring ≤ 90 days"
          value={alerts.expiring_soon.length}
          tint="info"
        />
        <StatCard
          icon={<ReportProblemOutlinedIcon />}
          label="Expired on hand"
          value={alerts.expired.length}
          tint="error"
        />
      </Stack>

      <Stack spacing={2.5}>
        <SectionCard
          title="Reorder list (low / out of stock)"
          icon={<ReplayCircleFilledIcon />}
          color="warning.main"
        >
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    On hand
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Min level
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {alerts.low_stock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary" align="center">
                        Nothing to reorder — all items are above their minimum.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  alerts.low_stock.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => openProduct(row.id)}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {row.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {row.sku}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>
                        {row.category ?? "—"}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>
                        {row.quantity} {row.unit}
                      </TableCell>
                      <TableCell align="right" sx={{ color: "text.secondary" }}>
                        {row.reorder_level}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={row.stock_status === "out" ? "Out of stock" : "Low"}
                          color={row.stock_status === "out" ? "error" : "warning"}
                          variant={row.stock_status === "out" ? "filled" : "outlined"}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>

        <SectionCard
          title="Expiring soon (within 90 days)"
          icon={<EventBusyOutlinedIcon />}
          color="info.main"
        >
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Batch</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Qty
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Expiry</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Days left
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {alerts.expiring_soon.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary" align="center">
                        No batches expiring within 90 days.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  alerts.expiring_soon.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => openProduct(row.product_id)}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>{row.product_name}</TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>
                        {row.batch_number}
                      </TableCell>
                      <TableCell align="right">
                        {row.quantity} {row.unit}
                      </TableCell>
                      <TableCell>{dayjs(row.expiry_date).format("DD MMM YYYY")}</TableCell>
                      <TableCell align="right">
                        <Chip
                          size="small"
                          label={`${row.days_to_expiry} d`}
                          color={row.days_to_expiry <= 30 ? "warning" : "default"}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>

        <SectionCard
          title="Expired stock on hand"
          icon={<ReportProblemOutlinedIcon />}
          color="error.main"
        >
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Batch</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">
                    Qty
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Expired on</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {alerts.expired.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary" align="center">
                        No expired stock on hand. 👍
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  alerts.expired.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{ cursor: "pointer" }}
                      onClick={() => openProduct(row.product_id)}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>{row.product_name}</TableCell>
                      <TableCell sx={{ color: "text.secondary" }}>
                        {row.batch_number}
                      </TableCell>
                      <TableCell align="right">
                        {row.quantity} {row.unit}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color="error"
                          label={dayjs(row.expiry_date).format("DD MMM YYYY")}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </SectionCard>
      </Stack>
    </Box>
  );
}
