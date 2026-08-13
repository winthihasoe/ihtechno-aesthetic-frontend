import { Box, Chip, Divider, Stack, Typography } from "@mui/material";
import dayjs from "dayjs";

const actionLabels = {
  saved: "Saved",
  completed: "Completed",
  skipped: "Skipped",
  follow_again_created: "Follow-up scheduled",
};

const feedbackLabels = {
  interested: "Interested",
  not_interested: "Not Interested",
  no_response: "No Response",
  follow_again: "Follow Again",
};

const callLabels = {
  answered: "Answered",
  no_answer: "No Answer",
  busy: "Busy",
};

function formatLoggedAt(value) {
  if (!value) return "—";
  const dt = dayjs(value);
  return dt.isValid() ? dt.format("DD-MM-YYYY HH:mm") : "—";
}

export default function FollowUpHistoryPanel({ history }) {
  const chain = history?.chain ?? [];
  const entries = history?.entries ?? [];
  const chainTotal = history?.chain_attempt_total ?? 0;

  if (chain.length === 0 && entries.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No calls logged yet for this chain.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Typography variant="subtitle2" fontWeight={600}>
          Follow-up history
        </Typography>
        {chainTotal > 0 ? (
          <Chip size="small" label={`${chainTotal} attempt${chainTotal === 1 ? "" : "s"} in chain`} />
        ) : null}
      </Stack>

      {chain.length > 0 ? (
        <Stack spacing={0.75}>
          {chain.map((item) => (
            <Typography key={item.task_id} variant="caption" color="text.secondary">
              Task #{item.task_id} · {item.title || "Follow-up"} · due{" "}
              {item.due_date ? dayjs(item.due_date).format("DD-MM-YYYY") : "—"} ·{" "}
              {item.status}
              {(item.attempt_count ?? 0) > 0 ? ` · ${item.attempt_count} attempt(s)` : ""}
            </Typography>
          ))}
        </Stack>
      ) : null}

      {entries.length > 0 ? (
        <>
          <Divider />
          <Stack spacing={1}>
            {entries.map((entry, idx) => (
              <Box
                key={`${entry.task_id}-${entry.logged_at}-${idx}`}
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1.5,
                  p: 1.25,
                }}
              >
                <Typography variant="caption" color="text.secondary" display="block">
                  {formatLoggedAt(entry.logged_at)}
                  {entry.staff_name ? ` · ${entry.staff_name}` : ""}
                  {entry.task_id ? ` · Task #${entry.task_id}` : ""}
                </Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mt: 0.5 }}>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={actionLabels[entry.action] || entry.action || "Logged"}
                  />
                  {entry.call_status ? (
                    <Chip
                      size="small"
                      label={callLabels[entry.call_status] || entry.call_status}
                    />
                  ) : null}
                  {entry.feedback_status ? (
                    <Chip
                      size="small"
                      label={feedbackLabels[entry.feedback_status] || entry.feedback_status}
                    />
                  ) : null}
                  {(entry.attempt_count ?? 0) > 0 ? (
                    <Chip size="small" label={`Attempt ${entry.attempt_count}`} />
                  ) : null}
                </Stack>
                {entry.feedback ? (
                  <Typography variant="body2" sx={{ mt: 0.75 }}>
                    {entry.feedback}
                  </Typography>
                ) : null}
              </Box>
            ))}
          </Stack>
        </>
      ) : null}
    </Stack>
  );
}
