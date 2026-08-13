import { Box, Stack, Tooltip, Typography } from "@mui/material";
import { fullVisitPhotoCaption, shortVisitPhotoCaption } from "../../utils/visitPhotoLabels";

/**
 * @param {{ photos: unknown[], emptyHint?: string, showStageInCaption?: boolean, onPhotoClick?: (photo: unknown) => void }} props
 */
export default function VisitPhotoThumbnails({
  photos = [],
  emptyHint = "",
  showStageInCaption = false,
  onPhotoClick,
}) {
  const list = Array.isArray(photos) ? photos : [];
  if (list.length === 0) {
    return emptyHint ? (
      <Typography variant="caption" color="text.secondary">
        {emptyHint}
      </Typography>
    ) : null;
  }

  return (
    <Stack direction="row" flexWrap="wrap" gap={1} sx={{ alignItems: "flex-start" }}>
      {list.map((p) => {
        const url = p?.url;
        if (!url) return null;
        const caption = showStageInCaption ? fullVisitPhotoCaption(p) : shortVisitPhotoCaption(p);
        const tip = fullVisitPhotoCaption(p);
        return (
          <Tooltip key={p.id} title={tip} arrow>
            <Box
              component={onPhotoClick ? "button" : "a"}
              href={onPhotoClick ? undefined : url}
              target={onPhotoClick ? undefined : "_blank"}
              rel={onPhotoClick ? undefined : "noopener noreferrer"}
              type={onPhotoClick ? "button" : undefined}
              onClick={onPhotoClick ? () => onPhotoClick(p) : undefined}
              sx={{
                width: 76,
                p: 0,
                border: 0,
                bgcolor: "transparent",
                font: "inherit",
                cursor: onPhotoClick ? "zoom-in" : "pointer",
                textAlign: "left",
                textDecoration: "none",
                color: "inherit",
                "&:hover": { opacity: 0.92 },
              }}
            >
              <Box
                component="img"
                src={url}
                alt={tip}
                sx={{
                  width: 76,
                  height: 76,
                  objectFit: "cover",
                  borderRadius: 1,
                  border: 1,
                  borderColor: "divider",
                  display: "block",
                  bgcolor: "action.hover",
                }}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.25, lineHeight: 1.2, maxWidth: 76 }}
                noWrap
              >
                {caption}
              </Typography>
            </Box>
          </Tooltip>
        );
      })}
    </Stack>
  );
}
