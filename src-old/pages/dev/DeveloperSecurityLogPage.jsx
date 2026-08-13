import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import apiClient, { resolveApiError } from "../../services/apiClient";

const AUTO_REFRESH_MS = 20000;

const MONO =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace';

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}-${pad(date.getMonth() + 1)}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const FAILURE_LABELS = {
  invalid_credentials: "invalid_credentials",
  deactivated: "deactivated",
};

const formatFailureReason = (reason) =>
  FAILURE_LABELS[reason] || reason || "failed";

const formatLocation = (city, country) => {
  const segments = [city, country].filter(Boolean);
  return segments.length ? segments.join(", ") : "—";
};

const pageShellSx = {
  minHeight: "100dvh",
  height: "100dvh",
  boxSizing: "border-box",
  overflowY: "auto",
  overflowX: "hidden",
  overscrollBehavior: "contain",
  WebkitOverflowScrolling: "touch",
  px: { xs: 1.5, sm: 2 },
  py: { xs: 1.5, sm: 2 },
  display: "flex",
  flexDirection: "column",
  gap: 1.25,
  fontFamily: MONO,
  fontSize: "0.75rem",
};

const tableScrollSx = {
  maxHeight: { xs: 240, sm: 300, md: 340 },
  overflowY: "auto",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
};

function Panel({ title, hint, count, children, panelSx }) {
  return (
    <Box sx={panelSx}>
      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 1,
          px: 1.25,
          py: 0.75,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="span"
            sx={{
              fontFamily: MONO,
              fontSize: "0.7rem",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "text.primary",
            }}
          >
            {title}
          </Typography>
          {hint ? (
            <Typography
              component="span"
              sx={{
                fontFamily: MONO,
                fontSize: "0.65rem",
                color: "text.secondary",
                ml: 1,
              }}
            >
              {hint}
            </Typography>
          ) : null}
        </Box>
        {count != null ? (
          <Typography
            sx={{
              fontFamily: MONO,
              fontSize: "0.65rem",
              color: "text.secondary",
              flexShrink: 0,
            }}
          >
            [{count}]
          </Typography>
        ) : null}
      </Box>
      {children}
    </Box>
  );
}

function StatusBadge({ successful, failureReason }) {
  if (successful) {
    return (
      <Box
        component="span"
        sx={{
          fontFamily: MONO,
          fontSize: "0.68rem",
          fontWeight: 600,
          color: "success.main",
        }}
      >
        ok
      </Box>
    );
  }

  return (
    <Box
      component="span"
      sx={{
        fontFamily: MONO,
        fontSize: "0.68rem",
        fontWeight: 600,
        color: "error.main",
      }}
    >
      {formatFailureReason(failureReason)}
    </Box>
  );
}

function LogTable({ columns, rows, stickyHeader = true, tableSx }) {
  return (
    <TableContainer sx={tableScrollSx}>
      <Table size="small" stickyHeader={stickyHeader} sx={tableSx}>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col}>{col}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>{rows}</TableBody>
      </Table>
    </TableContainer>
  );
}

export default function DeveloperSecurityLogPage() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);
  const [lastLogins, setLastLogins] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  const panelSx = useMemo(
    () => ({
      borderRadius: 1,
      border: "1px solid",
      borderColor:
        theme.palette.mode === "light"
          ? alpha(theme.palette.common.black, 0.12)
          : alpha(theme.palette.common.white, 0.12),
      bgcolor:
        theme.palette.mode === "light"
          ? alpha(theme.palette.common.white, 0.3)
          : alpha(theme.palette.background.paper, 0.72),
      backdropFilter: "blur(8px)",
      overflow: "hidden",
    }),
    [
      theme.palette.mode,
      theme.palette.common.black,
      theme.palette.common.white,
      theme.palette.background.paper,
    ],
  );

  const cellSx = {
    fontFamily: MONO,
    fontSize: "0.72rem",
    py: 0.55,
    px: 1.25,
    lineHeight: 1.35,
    borderColor: "divider",
    whiteSpace: "nowrap",
  };

  const headCellSx = {
    ...cellSx,
    fontWeight: 600,
    fontSize: "0.65rem",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "text.secondary",
    bgcolor:
      theme.palette.mode === "light"
        ? alpha(theme.palette.grey[100], 0.95)
        : alpha(theme.palette.grey[900], 0.85),
  };

  const tableSx = {
    "& .MuiTableCell-root": cellSx,
    "& .MuiTableHead-root .MuiTableCell-root": headCellSx,
    "& .MuiTableBody-root .MuiTableRow-root:hover": {
      bgcolor: alpha(theme.palette.primary.main, 0.06),
    },
    "& .MuiTableBody-root .MuiTableRow-root.row-fail": {
      bgcolor: alpha(theme.palette.error.main, 0.06),
    },
  };

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const [eventsRes, usersRes] = await Promise.all([
        apiClient.get("/developer/security/login-events?limit=100"),
        apiClient.get("/developer/security/user-last-logins?limit=200"),
      ]);

      setEvents(
        Array.isArray(eventsRes?.data?.data) ? eventsRes.data.data : [],
      );
      setLastLogins(
        Array.isArray(usersRes?.data?.data) ? usersRes.data.data : [],
      );
      setLastUpdated(new Date());
    } catch (err) {
      setError(resolveApiError(err, "Failed to load developer security logs."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => load({ silent: true }), AUTO_REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const activeUserCount = useMemo(
    () => lastLogins.filter((item) => item.last_login_at).length,
    [lastLogins],
  );

  const failedCount = useMemo(
    () => events.filter((event) => !event.successful).length,
    [events],
  );

  if (loading) {
    return (
      <Box
        sx={{
          ...pageShellSx,
          alignItems: "center",
          justifyContent: "center",
          color: "text.secondary",
        }}
      >
        <Typography sx={{ fontFamily: MONO, fontSize: "0.75rem" }}>
          $ fetching security logs...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={pageShellSx}>
      <Box
        sx={{
          ...panelSx,
          px: 1.25,
          py: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: MONO,
              fontSize: "0.82rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            security-log
          </Typography>
          <Typography
            sx={{
              fontFamily: MONO,
              fontSize: "0.65rem",
              color: "text.secondary",
              mt: 0.25,
            }}
          >
            /dev/security-log · login audit · auto-refresh 20s
            {lastUpdated
              ? ` · synced ${formatDateTime(lastUpdated.toISOString())}`
              : ""}
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <span>
            <IconButton
              size="small"
              onClick={() => load({ silent: true })}
              disabled={refreshing}
              sx={{
                fontFamily: MONO,
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
                width: 28,
                height: 28,
              }}
            >
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 0.75,
          px: 0.25,
        }}
      >
        {[
          { label: "events", value: events.length },
          { label: "failed", value: failedCount, warn: failedCount > 0 },
          { label: "users_active", value: activeUserCount },
        ].map((stat) => (
          <Box
            key={stat.label}
            sx={{
              fontFamily: MONO,
              fontSize: "0.68rem",
              px: 0.9,
              py: 0.35,
              borderRadius: 0.75,
              border: "1px solid",
              borderColor: stat.warn ? "error.main" : "divider",
              color: stat.warn ? "error.main" : "text.secondary",
              bgcolor: stat.warn
                ? alpha(theme.palette.error.main, 0.08)
                : alpha(theme.palette.text.primary, 0.04),
            }}
          >
            {stat.label}={stat.value}
          </Box>
        ))}
      </Box>

      {error ? (
        <Alert
          severity="error"
          sx={{
            py: 0.25,
            fontFamily: MONO,
            fontSize: "0.72rem",
            "& .MuiAlert-message": { fontFamily: MONO },
          }}
        >
          {error}
        </Alert>
      ) : null}

      <Panel
        title="last_login.snapshot"
        hint="// per-user latest session"
        count={lastLogins.length}
        panelSx={panelSx}
      >
        <LogTable
          tableSx={tableSx}
          columns={["user", "last_login", "ip", "location", "device"]}
          rows={lastLogins.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <Box sx={{ fontFamily: MONO, fontSize: "0.72rem" }}>
                  {user.name}
                </Box>
                <Box
                  sx={{
                    fontFamily: MONO,
                    fontSize: "0.65rem",
                    color: "text.secondary",
                  }}
                >
                  {user.email}
                </Box>
              </TableCell>
              <TableCell>{formatDateTime(user.last_login_at)}</TableCell>
              <TableCell sx={{ color: "primary.main" }}>
                {user.last_login_ip || "—"}
              </TableCell>
              <TableCell>
                {formatLocation(user.last_login_city, user.last_login_country)}
              </TableCell>
              <TableCell
                sx={{
                  maxWidth: 220,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: "text.secondary",
                  fontSize: "0.65rem !important",
                }}
              >
                {user.last_login_user_agent || "—"}
              </TableCell>
            </TableRow>
          ))}
        />
      </Panel>

      <Panel
        title="login_events.recent"
        hint="// includes failed attempts"
        count={events.length}
        panelSx={panelSx}
      >
        <LogTable
          tableSx={tableSx}
          columns={["ts", "status", "identity", "ip", "location", "device"]}
          rows={events.map((event) => (
            <TableRow
              key={event.id}
              className={event.successful ? undefined : "row-fail"}
            >
              <TableCell>{formatDateTime(event.logged_in_at)}</TableCell>
              <TableCell>
                <StatusBadge
                  successful={event.successful}
                  failureReason={event.failure_reason}
                />
              </TableCell>
              <TableCell>
                <Box sx={{ fontFamily: MONO, fontSize: "0.72rem" }}>
                  {event.user?.name || "unknown"}
                </Box>
                <Box
                  sx={{
                    fontFamily: MONO,
                    fontSize: "0.65rem",
                    color: "text.secondary",
                  }}
                >
                  {event.user?.email || event.email || "—"}
                </Box>
              </TableCell>
              <TableCell sx={{ color: "primary.main" }}>
                {event.ip_address || "—"}
              </TableCell>
              <TableCell>{formatLocation(event.city, event.country)}</TableCell>
              <TableCell
                sx={{
                  maxWidth: 220,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: "text.secondary",
                  fontSize: "0.65rem !important",
                }}
              >
                {event.user_agent || "—"}
              </TableCell>
            </TableRow>
          ))}
        />
      </Panel>

      <Box sx={{ flexShrink: 0, height: 6 }} aria-hidden />
    </Box>
  );
}
