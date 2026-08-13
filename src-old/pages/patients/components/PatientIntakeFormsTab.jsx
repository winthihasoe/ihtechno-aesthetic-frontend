import dayjs from "dayjs";
import { Box, Card, Stack, Typography } from "@mui/material";

export default function PatientIntakeFormsTab({ formResponses }) {
  if (!formResponses?.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No intake forms submitted yet.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.25}>
      {formResponses.map((response) => (
        <Card key={response.id} variant="outlined" sx={{ p: 1.5 }}>
          <Typography variant="body2" fontWeight={600}>
            {response.form?.name || "Form response"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Submitted by {response.submitted_by?.name || "Unknown"} on{" "}
            {response.created_at ? dayjs(response.created_at).format("D MMM YYYY, HH:mm") : "-"}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            Visit: {response.visit?.queue_number ?? response.visit_id ?? "N/A"}
          </Typography>
          <Stack spacing={1} sx={{ mt: 1.5 }}>
            {Object.entries(response.data ?? {}).map(([key, value]) => (
              <Box key={key}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 600, textTransform: "capitalize" }}
                >
                  {key.replace(/_/g, " ")}
                </Typography>
                <Typography variant="body2">
                  {Array.isArray(value) ? value.join(", ") || "-" : value || "-"}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
