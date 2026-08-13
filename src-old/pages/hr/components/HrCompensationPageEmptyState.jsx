import AddIcon from "@mui/icons-material/Add";
import { Box, Button, Stack, Typography } from "@mui/material";

/**
 * @param {object} props
 * @param {import("@mui/material").SvgIconComponent} [props.icon]
 * @param {string} props.title
 * @param {string} props.description
 * @param {{ label: string, text: string }[]} [props.bullets]
 * @param {{ label: string, onClick: () => void, variant?: "contained" | "outlined" }} props.primaryAction
 * @param {{ label: string, onClick: () => void }} [props.secondaryAction]
 * @param {string} [props.footerCaption]
 */
export default function HrCompensationPageEmptyState({
  icon: Icon,
  title,
  description,
  bullets = [],
  primaryAction,
  secondaryAction,
  footerCaption,
}) {
  return (
    <Box
      sx={{
        p: { xs: 2.5, sm: 3 },
        textAlign: "center",
      }}
    >
      {Icon ? (
        <Icon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
      ) : null}
      <Typography variant="h6" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ maxWidth: 560, mx: "auto", mb: bullets.length ? 2 : 2.5 }}
      >
        {description}
      </Typography>
      {bullets.length ? (
        <Stack
          spacing={0.75}
          sx={{
            maxWidth: 520,
            mx: "auto",
            textAlign: "left",
            mb: 2.5,
            px: 1,
          }}
        >
          {bullets.map((bullet) => (
            <Typography
              key={bullet.label}
              variant="body2"
              color="text.secondary"
            >
              <strong>{bullet.label}</strong> {bullet.text}
            </Typography>
          ))}
        </Stack>
      ) : null}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        justifyContent="center"
        sx={{ mb: footerCaption ? 1 : 0 }}
      >
        <Button
          variant={primaryAction.variant || "contained"}
          startIcon={<AddIcon />}
          onClick={primaryAction.onClick}
        >
          {primaryAction.label}
        </Button>
        {secondaryAction ? (
          <Button variant="outlined" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        ) : null}
      </Stack>
      {footerCaption ? (
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ mt: 1 }}
        >
          {footerCaption}
        </Typography>
      ) : null}
    </Box>
  );
}
