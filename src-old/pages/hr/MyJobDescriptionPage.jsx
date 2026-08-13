import { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  getMyJobDescription,
  getTeamJobDescriptions,
} from "../../services/hrService";
import { sanitizeRichHtml } from "../../components/common/RichTextEditor";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";

const SOURCE_LABELS = {
  template: "From position template",
  override: "Custom for you",
  empty: "Not set yet",
};

function JobDescriptionBody({ html }) {
  const content = sanitizeRichHtml(html || "");
  if (!content.replace(/<[^>]+>/g, "").trim()) {
    return (
      <Typography variant="body2" color="text.secondary">
        No job description has been assigned yet. Please contact HR.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        fontSize: 14,
        lineHeight: 1.7,
        "& p": { my: 0.75 },
        "& ul": { my: 0.75, pl: 3 },
      }}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

export default function MyJobDescriptionPage() {
  const { pushToast } = useToastStore();
  const [mine, setMine] = useState(null);
  const [team, setTeam] = useState([]);

  useEffect(() => {
    getMyJobDescription()
      .then(setMine)
      .catch((error) => {
        pushToast({
          message: resolveApiError(error, "Failed to load your job description."),
          severity: "error",
        });
      });

    getTeamJobDescriptions()
      .then((rows) => setTeam(rows || []))
      .catch(() => {
        setTeam([]);
      });
  }, [pushToast]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 820, mx: "auto" }}>
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={1}
            sx={{ mb: 2 }}
          >
            <Box>
              <Typography variant="h5" fontWeight={800}>
                My Job Description
              </Typography>
              {mine?.position_title ? (
                <Typography variant="body2" color="text.secondary">
                  {mine.position_title}
                  {mine.job_position?.title && mine.job_position.title !== mine.position_title
                    ? ` · Template: ${mine.job_position.title}`
                    : ""}
                </Typography>
              ) : null}
            </Box>
            {mine?.source ? (
              <Chip
                size="small"
                label={SOURCE_LABELS[mine.source] || mine.source}
                color={mine.source === "empty" ? "default" : "primary"}
                variant="outlined"
              />
            ) : null}
          </Stack>
          <JobDescriptionBody html={mine?.effective_job_description} />
        </CardContent>
      </Card>

      {team.length > 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>
              My Team
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Job descriptions for staff who report to you.
            </Typography>
            <Stack spacing={1}>
              {team.map((member) => (
                <Accordion key={member.user_id} disableGutters variant="outlined">
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight={600}>{member.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {member.position_title || "No position"}
                      </Typography>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails>
                    <JobDescriptionBody html={member.effective_job_description} />
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </CardContent>
        </Card>
      ) : null}
    </Box>
  );
}
