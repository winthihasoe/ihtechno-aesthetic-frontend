import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import InboxOutlinedIcon from "@mui/icons-material/InboxOutlined";

/**
 * Professional empty-state for lists, tables, and detail panels.
 *
 * @param {object} props
 * @param {import("@mui/material").SvgIconComponent} [props.icon]
 * @param {string} [props.title]
 * @param {string} [props.description]
 * @param {{ label: string, onClick: () => void, startIcon?: React.ReactNode, variant?: string } | null} [props.action]
 * @param {"default" | "compact"} [props.size]
 * @param {import("@mui/material").SxProps} [props.sx]
 * @param {React.ReactNode} [props.children]
 */
export default function EmptyData({
  icon: Icon = InboxOutlinedIcon,
  title = "No data to show",
  description = "There is nothing available here yet.",
  action = null,
  size = "default",
  sx,
  children,
}) {
  const theme = useTheme();
  const compact = size === "compact";
  const iconSize = compact ? 40 : 52;
  const circleSize = compact ? 72 : 88;

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        px: compact ? 2.5 : 3.5,
        py: compact ? 4 : 6,
        borderRadius: 2,
        border: 1,
        borderColor: "divider",
        borderStyle: "dashed",
        bgcolor: (t) =>
          alpha(
            t.palette.text.primary,
            t.palette.mode === "dark" ? 0.04 : 0.015,
          ),
        ...sx,
      }}
    >
      <Box
        sx={{
          width: circleSize,
          height: circleSize,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: compact ? 1.5 : 2,
          bgcolor: alpha(
            theme.palette.primary.main,
            theme.palette.mode === "dark" ? 0.16 : 0.08,
          ),
          boxShadow: `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.12)}`,
        }}
      >
        <Icon
          sx={{
            fontSize: iconSize,
            color: "primary.main",
            opacity: 0.9,
          }}
        />
      </Box>

      <Typography
        variant={compact ? "subtitle1" : "h6"}
        fontWeight={700}
        color="text.primary"
        gutterBottom
        sx={{ letterSpacing: "-0.01em" }}
      >
        {title}
      </Typography>

      {description ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            maxWidth: 440,
            mx: "auto",
            lineHeight: 1.65,
            mb: action || children ? 2 : 0,
          }}
        >
          {description}
        </Typography>
      ) : null}

      {children ? (
        <Box sx={{ width: "100%", maxWidth: 480, mt: description ? 0 : 1.5 }}>
          {children}
        </Box>
      ) : null}

      {action ? (
        <Stack direction="row" justifyContent="center" sx={{ mt: children ? 2 : 0 }}>
          <Button
            variant={action.variant || "outlined"}
            size={compact ? "small" : "medium"}
            startIcon={action.startIcon}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        </Stack>
      ) : null}
    </Box>
  );
}
