import { Box, IconButton, Link, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import { documentStorageUrl, isDocumentPdf } from "./staffProfileFormConstants";

const PREVIEW_SIZE = 200;

export default function StaffDocumentPreviewCard({ doc, label, onRemove }) {
  const url = documentStorageUrl(doc);
  const isPdf = isDocumentPdf(doc);
  const title = doc.original_name || label;

  return (
    <Box
      sx={{
        position: "relative",
        width: PREVIEW_SIZE,
        height: PREVIEW_SIZE,
        flexShrink: 0,
        borderRadius: 1,
        border: 1,
        borderColor: "divider",
        overflow: "hidden",
        bgcolor: "action.hover",
      }}
    >
      <IconButton
        size="small"
        aria-label={`Remove ${title}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        sx={{
          position: "absolute",
          top: 4,
          right: 4,
          zIndex: 2,
          bgcolor: "rgba(0, 0, 0, 0.55)",
          color: "common.white",
          "&:hover": { bgcolor: "rgba(0, 0, 0, 0.75)" },
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      {isPdf ? (
        <Box
          component={Link}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          underline="none"
          color="inherit"
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            px: 1,
            pt: 4,
            pb: 1,
            boxSizing: "border-box",
          }}
        >
          <PictureAsPdfOutlinedIcon sx={{ fontSize: 48, color: "error.main", mb: 1 }} />
          <Typography
            variant="caption"
            align="center"
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              wordBreak: "break-word",
            }}
          >
            {title}
          </Typography>
        </Box>
      ) : (
        <Box
          component={Link}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: "block",
            width: "100%",
            height: "100%",
          }}
        >
          <Box
            component="img"
            src={url}
            alt={title}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        </Box>
      )}
    </Box>
  );
}
