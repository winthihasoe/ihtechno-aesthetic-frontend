import { Box, Chip, Stack, Typography } from "@mui/material";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";

export default function PatientTabEmptyState({
  title,
  description,
  steps = [],
  previewFields = [],
  action = null,
}) {
  return (
    <Box
      sx={{
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: 2,
        px: { xs: 1.5, md: 2 },
        py: { xs: 5, md: 7 },
        bgcolor: "background.paper",
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.25,
            bgcolor: "primary.light",
            color: "primary.dark",
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          <DescriptionOutlinedIcon sx={{ fontSize: 18 }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {description}
          </Typography>

          {steps.length > 0 && (
            <Stack spacing={0.35} sx={{ mt: 1.15 }}>
              {steps.map((step, index) => (
                <Typography key={step} variant="caption" color="text.secondary">
                  {index + 1}. {step}
                </Typography>
              ))}
            </Stack>
          )}

          {/* {previewFields.length > 0 && (
            <Stack
              direction="row"
              spacing={0.75}
              useFlexGap
              flexWrap="wrap"
              sx={{ mt: 1.25 }}
            >
              {previewFields.map((field) => (
                <Chip
                  key={field}
                  size="small"
                  label={field}
                  sx={{ fontSize: 11 }}
                />
              ))}
            </Stack>
          )} */}
          {action}
        </Box>
      </Stack>
    </Box>
  );
}
