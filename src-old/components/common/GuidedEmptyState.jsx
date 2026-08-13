import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

/**
 * @param {object} props
 * @param {"primary" | "warning"} [props.accent]
 * @param {import("@mui/material").SvgIconComponent} props.icon
 * @param {string} props.title
 * @param {string} props.description
 * @param {{ label: string, onClick: () => void, startIcon?: React.ReactNode } | null} [props.primaryAction]
 * @param {Array<{ icon: import("@mui/material").SvgIconComponent, title: string, body: string }>} props.steps
 * @param {React.ReactNode} [props.footer]
 */
export default function GuidedEmptyState({
  accent = "primary",
  icon: PageIcon,
  title,
  description,
  primaryAction = null,
  steps,
  footer = null,
}) {
  const theme = useTheme();
  const accentColor = theme.palette[accent].main;

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: alpha(
          accentColor,
          theme.palette.mode === "dark" ? 0.06 : 0.04,
        ),
        m: { xs: 1, sm: 2 },
      }}
    >
      <Box
        sx={{
          textAlign: "center",
          py: { xs: 5, sm: 7 },
          px: { xs: 2.5, sm: 4 },
        }}
      >
        <Box
          sx={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
            bgcolor: alpha(
              accentColor,
              theme.palette.mode === "dark" ? 0.2 : 0.12,
            ),
          }}
        >
          <PageIcon sx={{ fontSize: 36, color: `${accent}.main` }} />
        </Box>
        <Typography
          variant="h6"
          fontWeight={700}
          color="text.primary"
          gutterBottom
        >
          {title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ maxWidth: 520, mx: "auto", lineHeight: 1.65 }}
        >
          {description}
        </Typography>
        {primaryAction ? (
          <Button
            variant="contained"
            onClick={primaryAction.onClick}
            startIcon={primaryAction.startIcon}
            sx={{ mt: 2.5 }}
          >
            {primaryAction.label}
          </Button>
        ) : null}
      </Box>

      <Box sx={{ px: { xs: 2.5, sm: 4 }, pb: { xs: 4, sm: 5 }, pt: 1 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={2}
          sx={{ maxWidth: 960, mx: "auto" }}
        >
          {steps.map(({ icon: Icon, title: stepTitle, body }) => (
            <Paper
              key={stepTitle}
              variant="outlined"
              sx={{
                flex: 1,
                p: 2.5,
                borderRadius: 2,
                bgcolor: "background.paper",
                textAlign: "left",
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Box
                  sx={{ mt: 0.25, color: `${accent}.main`, display: "flex" }}
                >
                  <Icon fontSize="small" />
                </Box>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    {stepTitle}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    lineHeight={1.6}
                  >
                    {body}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>

        {footer ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 3, textAlign: "center" }}
          >
            {footer}
          </Typography>
        ) : null}
      </Box>
    </Paper>
  );
}
