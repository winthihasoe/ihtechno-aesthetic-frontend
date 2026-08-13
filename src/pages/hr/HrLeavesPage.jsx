import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import HrPageShell from "./components/HrPageShell";
import {
  approveLeave,
  getLeaves,
  rejectLeave,
  resolveLeaveAppeal,
  sendLeaveReply,
} from "../../services/hrService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";

const STORAGE_BASE =
  (import.meta.env.VITE_API_URL || "http://localhost:8000/api").replace(
    /\/api$/,
    "",
  ) + "/storage/";

function isImagePath(path) {
  return /\.(jpe?g|png|gif|webp|heic|heif|bmp|svg)$/i.test(path);
}

const formatMonth = (monthKey) => {
  if (monthKey === "Unknown") return "Unknown month";
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
};

const monthKeyFrom = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const leaveMonthDate = (row) => row.start_date || row.created_at;

const statusColor = (status) => {
  if (status === "approved") return "success";
  if (status === "denied") return "error";
  if (status === "pending") return "warning";
  return "default";
};

const statusLabel = (status) =>
  String(status || "unknown").replaceAll("_", " ");

export default function HrLeavesPage() {
  const { pushToast } = useToastStore();
  const [rows, setRows] = useState([]);
  const [filters, setFilters] = useState({ status: "", leaveType: "" });
  const [decisionNote, setDecisionNote] = useState({});
  const [replyMessage, setReplyMessage] = useState({});

  const load = () => getLeaves().then((res) => setRows(res.data || []));
  useEffect(() => {
    load();
  }, []);

  const runAction = async (callback, message) => {
    try {
      await callback();
      pushToast({ message, severity: "success" });
      await load();
    } catch (error) {
      pushToast({
        message: resolveApiError(error, "Action failed."),
        severity: "error",
      });
    }
  };

  const filteredRows = rows.filter((row) => {
    if (filters.status && row.status !== filters.status) return false;
    if (filters.leaveType && row.leave_type !== filters.leaveType) return false;
    return true;
  });

  const groupedMonths = useMemo(() => {
    const months = new Map();

    filteredRows.forEach((row) => {
      const monthKey = monthKeyFrom(leaveMonthDate(row));
      if (!months.has(monthKey)) {
        months.set(monthKey, []);
      }
      months.get(monthKey).push(row);
    });

    return Array.from(months.entries())
      .map(([monthKey, monthRows]) => ({
        monthKey,
        rows: monthRows.sort((a, b) =>
          String(leaveMonthDate(b)).localeCompare(String(leaveMonthDate(a))),
        ),
      }))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [filteredRows]);

  const formatDate = (value) => {
    if (!value) return "-";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  };

  return (
    <HrPageShell
      title="HR Module"
      subtitle="Daily record - Leaves"
      guide={[
        "Staff leave requests (annual, sick, casual) with an approval workflow.",
        "Approve or reject pending requests — entitlements follow the Leave Rules page.",
        "Approved leave is reflected in attendance and payroll.",
      ]}
    >
      <Stack spacing={2}>
        <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Stack spacing={1.5}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", md: "center" }}
              spacing={1.5}
            >
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Leave Requests
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Review HR and owner leave approvals grouped by request month.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip size="small" label={`${filteredRows.length} showing`} />
                <Chip
                  size="small"
                  color="warning"
                  variant="outlined"
                  label={`${rows.filter((row) => row.status === "pending").length} pending`}
                />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${rows.filter((row) => row.appeal_status === "submitted").length} appeals`}
                />
              </Stack>
            </Stack>

            <Divider />

            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField
                select
                size="small"
                label="Filter status"
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, status: e.target.value }))
                }
                sx={{
                  width: { xs: "100%", md: 220, lg: 240 },
                  flex: "0 0 auto",
                }}
              >
                <MenuItem value="">All statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="approved">Approved</MenuItem>
                <MenuItem value="denied">Denied</MenuItem>
                <MenuItem value="cancelled_by_employee">Cancelled</MenuItem>
              </TextField>
              <TextField
                select
                size="small"
                label="Filter leave type"
                value={filters.leaveType}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, leaveType: e.target.value }))
                }
                sx={{
                  width: { xs: "100%", md: 220, lg: 240 },
                  flex: "0 0 auto",
                }}
              >
                <MenuItem value="">All leave types</MenuItem>
                <MenuItem value="annual">Annual</MenuItem>
                <MenuItem value="sick">Sick</MenuItem>
                <MenuItem value="unpaid">Unpaid</MenuItem>
              </TextField>
            </Stack>
          </Stack>
        </Card>

        {groupedMonths.map((month) => (
          <Card
            key={month.monthKey}
            variant="outlined"
            sx={{ p: { xs: 1.5, sm: 2 } }}
          >
            <Stack spacing={1.5}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={1}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {formatMonth(month.monthKey)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {month.rows.length} leave request
                    {month.rows.length === 1 ? "" : "s"} in this month
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    label={`${month.rows.filter((row) => row.status === "pending").length} pending`}
                  />
                  <Chip
                    size="small"
                    variant="outlined"
                    label={`${month.rows.filter((row) => row.appeal_status === "submitted").length} appeals`}
                  />
                </Stack>
              </Stack>

              <Box
                sx={{
                  display: "grid",
                  gap: 1.25,
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(auto-fit, minmax(200px, 250px))",
                    md: "repeat(auto-fit, minmax(250px, 300px))",
                    lg: "repeat(auto-fit, minmax(360px, 420px))",
                  },
                  justifyContent: { xs: "stretch", sm: "start" },
                }}
              >
                {month.rows.map((row) => (
                  <Card
                    variant="outlined"
                    key={row.id}
                    sx={{
                      p: 1.5,
                      height: "100%",
                      transition:
                        "border-color 120ms ease, background-color 120ms ease",
                      "&:hover": {
                        borderColor: "primary.main",
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <Stack spacing={1.25}>
                      <Stack
                        direction="column"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        spacing={1}
                      >
                        <Box sx={{ minWidth: 0 }}>
                          <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                            alignItems="center"
                          >
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700 }}
                            >
                              {row.staff?.name || "Unassigned employee"}
                            </Typography>
                            <Chip
                              size="small"
                              color={statusColor(row.status)}
                              variant={
                                row.status === "approved"
                                  ? "filled"
                                  : "outlined"
                              }
                              label={statusLabel(row.status)}
                            />
                            {row.is_emergency ? (
                              <Chip
                                size="small"
                                color="error"
                                variant="outlined"
                                label="Emergency"
                              />
                            ) : null}
                          </Stack>
                          <Typography variant="body2" sx={{ mt: 0.35 }}>
                            {formatDate(row.start_date)} to{" "}
                            {formatDate(row.end_date)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {row.leave_type || "Leave"} | category:{" "}
                            {row.reason_category || "-"} | submitted{" "}
                            {formatDateTime(row.created_at)}
                          </Typography>
                        </Box>

                        <Stack
                          direction="row"
                          spacing={0.75}
                          flexWrap="wrap"
                          useFlexGap
                        >
                          {row.status === "pending" ? (
                            <>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() =>
                                  runAction(
                                    () =>
                                      approveLeave(row.id, {
                                        comment: decisionNote[row.id],
                                      }),
                                    "Leave approved.",
                                  )
                                }
                              >
                                Approve
                              </Button>
                              <Button
                                size="small"
                                color="error"
                                variant="outlined"
                                onClick={() =>
                                  runAction(
                                    () =>
                                      rejectLeave(row.id, {
                                        reason:
                                          decisionNote[row.id] ||
                                          "Denied by HR.",
                                      }),
                                    "Leave denied.",
                                  )
                                }
                              >
                                Deny
                              </Button>
                            </>
                          ) : null}
                          {row.appeal_status === "submitted" ? (
                            <>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() =>
                                  runAction(
                                    () =>
                                      resolveLeaveAppeal(row.id, {
                                        appeal_status: "resolved_upheld",
                                        appeal_resolution_note:
                                          decisionNote[row.id] ||
                                          "Original decision stands.",
                                      }),
                                    "Appeal resolved (upheld).",
                                  )
                                }
                              >
                                Uphold
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() =>
                                  runAction(
                                    () =>
                                      resolveLeaveAppeal(row.id, {
                                        appeal_status: "resolved_revised",
                                        appeal_resolution_note:
                                          decisionNote[row.id] ||
                                          "Decision revised after review.",
                                      }),
                                    "Appeal resolved (revised).",
                                  )
                                }
                              >
                                Revise
                              </Button>
                            </>
                          ) : null}
                        </Stack>
                      </Stack>

                      <Typography variant="body2">
                        {row.reason || "No reason provided."}
                      </Typography>

                      {row.attachment_paths?.length ? (
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mb: 0.5 }}
                          >
                            Leave attachments ({row.attachment_paths.length})
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                          >
                            {row.attachment_paths.map((path, idx) =>
                              isImagePath(path) ? (
                                <Box
                                  key={idx}
                                  component="a"
                                  href={STORAGE_BASE + path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Box
                                    component="img"
                                    src={STORAGE_BASE + path}
                                    alt={`leave-attachment-${idx + 1}`}
                                    sx={{
                                      width: 72,
                                      height: 72,
                                      objectFit: "cover",
                                      borderRadius: 1,
                                      border: "1px solid",
                                      borderColor: "divider",
                                      display: "block",
                                    }}
                                  />
                                </Box>
                              ) : (
                                <Button
                                  key={idx}
                                  size="small"
                                  variant="outlined"
                                  component="a"
                                  href={STORAGE_BASE + path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  sx={{
                                    fontSize: "0.7rem",
                                    textTransform: "none",
                                  }}
                                >
                                  File {idx + 1}
                                </Button>
                              ),
                            )}
                          </Stack>
                        </Box>
                      ) : null}

                      {row.appeal_status === "submitted" ? (
                        <Card
                          variant="outlined"
                          sx={{ p: 1, bgcolor: "action.hover" }}
                        >
                          <Typography variant="caption" color="text.secondary">
                            Appeal
                          </Typography>
                          <Typography variant="body2">
                            {row.appeal_reason}
                          </Typography>
                        </Card>
                      ) : null}

                      {row.management_reply_message ||
                      row.employee_reply_message ? (
                        <Card variant="outlined" sx={{ p: 1 }}>
                          {row.management_reply_message ? (
                            <Typography variant="body2">
                              Management reply: {row.management_reply_message} (
                              {formatDateTime(row.management_replied_at)})
                            </Typography>
                          ) : null}
                          {row.employee_reply_message ? (
                            <Typography variant="body2">
                              Employee reply: {row.employee_reply_message} (
                              {formatDateTime(row.employee_replied_at)})
                            </Typography>
                          ) : null}
                        </Card>
                      ) : null}

                      {row.employee_reply_attachment_paths?.length ? (
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block", mb: 0.5 }}
                          >
                            Employee reply attachments (
                            {row.employee_reply_attachment_paths.length})
                          </Typography>
                          <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                          >
                            {row.employee_reply_attachment_paths.map(
                              (path, idx) =>
                                isImagePath(path) ? (
                                  <Box
                                    key={idx}
                                    component="a"
                                    href={STORAGE_BASE + path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Box
                                      component="img"
                                      src={STORAGE_BASE + path}
                                      alt={`attachment-${idx + 1}`}
                                      sx={{
                                        width: 72,
                                        height: 72,
                                        objectFit: "cover",
                                        borderRadius: 1,
                                        border: "1px solid",
                                        borderColor: "divider",
                                        display: "block",
                                      }}
                                    />
                                  </Box>
                                ) : (
                                  <Button
                                    key={idx}
                                    size="small"
                                    variant="outlined"
                                    component="a"
                                    href={STORAGE_BASE + path}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{
                                      fontSize: "0.7rem",
                                      textTransform: "none",
                                    }}
                                  >
                                    File {idx + 1}
                                  </Button>
                                ),
                            )}
                          </Stack>
                        </Box>
                      ) : null}

                      <Stack direction="column" spacing={1}>
                        <TextField
                          size="small"
                          label="Decision note"
                          value={decisionNote[row.id] || ""}
                          onChange={(e) =>
                            setDecisionNote((prev) => ({
                              ...prev,
                              [row.id]: e.target.value,
                            }))
                          }
                          sx={{ flex: 1 }}
                        />
                        <TextField
                          size="small"
                          label="Reply message to employee"
                          value={replyMessage[row.id] || ""}
                          onChange={(e) =>
                            setReplyMessage((prev) => ({
                              ...prev,
                              [row.id]: e.target.value,
                            }))
                          }
                          sx={{ flex: 1 }}
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={!replyMessage[row.id]?.trim()}
                          onClick={async () => {
                            try {
                              await sendLeaveReply(row.id, {
                                management_reply_message: replyMessage[row.id],
                                decision_note:
                                  decisionNote[row.id] || undefined,
                              });
                              setReplyMessage((prev) => ({
                                ...prev,
                                [row.id]: "",
                              }));
                              pushToast({
                                message: "Management reply sent.",
                                severity: "success",
                              });
                              await load();
                            } catch (error) {
                              pushToast({
                                message: resolveApiError(
                                  error,
                                  "Action failed.",
                                ),
                                severity: "error",
                              });
                            }
                          }}
                        >
                          Send reply
                        </Button>
                      </Stack>

                      <Typography variant="caption" color="text.secondary">
                        Reviewed: {formatDateTime(row.reviewed_at)}
                      </Typography>
                    </Stack>
                  </Card>
                ))}
              </Box>
            </Stack>
          </Card>
        ))}

        {!groupedMonths.length ? (
          <Card variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No leave requests match the selected filters.
            </Typography>
          </Card>
        ) : null}
      </Stack>
    </HrPageShell>
  );
}
