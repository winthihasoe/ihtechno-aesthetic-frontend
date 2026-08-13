import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import apiClient, { resolveApiError } from "../../services/apiClient";

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
};

const formatLocation = (city, country) => {
  const segments = [city, country].filter(Boolean);
  return segments.length ? segments.join(", ") : "-";
};

export default function DeveloperSecurityLogPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [events, setEvents] = useState([]);
  const [lastLogins, setLastLogins] = useState([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [eventsRes, usersRes] = await Promise.all([
          apiClient.get("/developer/security/login-events?limit=100"),
          apiClient.get("/developer/security/user-last-logins?limit=200"),
        ]);

        if (!mounted) return;
        setEvents(Array.isArray(eventsRes?.data?.data) ? eventsRes.data.data : []);
        setLastLogins(Array.isArray(usersRes?.data?.data) ? usersRes.data.data : []);
      } catch (err) {
        if (!mounted) return;
        setError(resolveApiError(err, "Failed to load developer security logs."));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const activeUserCount = useMemo(
    () => lastLogins.filter((item) => item.last_login_at).length,
    [lastLogins],
  );

  if (loading) {
    return (
      <Box sx={{ p: 3, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: "grid", gap: 2 }}>
      <Typography variant="h5">Developer Security Logs</Typography>
      <Typography variant="body2" color="text.secondary">
        Hidden developer-only view of login history and last login metadata.
      </Typography>

      {error ? <Alert severity="error">{error}</Alert> : null}

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Last Login Snapshot
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Users with recorded login: {activeUserCount}
          </Typography>
          <Divider sx={{ my: 1.5 }} />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Last Login</TableCell>
                  <TableCell>IP</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Device</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lastLogins.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Typography variant="body2">{user.name}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDateTime(user.last_login_at)}</TableCell>
                    <TableCell>{user.last_login_ip || "-"}</TableCell>
                    <TableCell>
                      {formatLocation(user.last_login_city, user.last_login_country)}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Typography variant="caption">
                        {user.last_login_user_agent || "-"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Recent Login Events
          </Typography>
          <Divider sx={{ my: 1.5 }} />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>When</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>IP</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>Device</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{formatDateTime(event.logged_in_at)}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{event.user?.name || "-"}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {event.user?.email || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>{event.ip_address || "-"}</TableCell>
                    <TableCell>{formatLocation(event.city, event.country)}</TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Typography variant="caption">
                        {event.user_agent || "-"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
