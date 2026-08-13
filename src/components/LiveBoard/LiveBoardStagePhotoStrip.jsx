import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import { uploadPhoto } from "../../services/photoService";
import { resolveApiError } from "../../services/apiClient";
import useToastStore from "../../stores/toastStore";
import {
  BODY_AREA_OPTIONS,
  STAGE_LABELS,
  photosForStage,
  photosFromEarlierStages,
} from "../../utils/visitPhotoLabels";
import VisitPhotoThumbnails from "./VisitPhotoThumbnails";

/**
 * Visit photos for all stages (same `photos` array the board uses). Shows earlier stages as
 * read-only previews, then this stage’s uploads with body area / side labels.
 */
export default function LiveBoardStagePhotoStrip({
  visitId,
  stage,
  photos = [],
  disabled = false,
  onPhotoUploaded,
  onPhotoClick,
}) {
  const pushToast = useToastStore((s) => s.pushToast);
  const [uploadingType, setUploadingType] = useState("");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadType, setUploadType] = useState("before");
  const [bodyArea, setBodyArea] = useState("face");
  const [side, setSide] = useState("");

  const priorPhotos = photosFromEarlierStages(photos, stage);
  const forStage = photosForStage(photos, stage);
  const beforeCount = forStage.filter((p) => p.type === "before").length;
  const afterCount = forStage.filter((p) => p.type === "after").length;

  const handleFile = async (type, file) => {
    if (!file || !visitId) return;
    setUploadingType(type);
    try {
      const uploaded = await uploadPhoto(visitId, file, type, stage, {
        body_area: bodyArea,
        side: side || undefined,
      });
      onPhotoUploaded?.(uploaded);
      pushToast({
        message: `${type === "before" ? "Before" : "After"} photo uploaded (${STAGE_LABELS[stage] ?? stage}).`,
        severity: "success",
      });
      setUploadDialogOpen(false);
    } catch (err) {
      pushToast({
        message: resolveApiError(err, "Unable to upload photo."),
        severity: "error",
      });
    } finally {
      setUploadingType("");
    }
  };

  return (
    <Box
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
      sx={{ mt: 1 }}
    >
      {priorPhotos.length > 0 && (
        <Box sx={{ mb: 1.25 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
            From earlier steps (reference — avoid duplicate shots when possible)
          </Typography>
          <VisitPhotoThumbnails
            photos={priorPhotos}
            showStageInCaption
            onPhotoClick={onPhotoClick}
          />
        </Box>
      )}

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
        This column: {STAGE_LABELS[stage] ?? stage}
      </Typography>

      {forStage.length > 0 && (
        <Box sx={{ mb: 1 }}>
          <VisitPhotoThumbnails photos={forStage} emptyHint="" onPhotoClick={onPhotoClick} />
        </Box>
      )}

      <Stack direction="row" flexWrap="wrap" gap={0.75} alignItems="center">
        <Button
          variant="contained"
          disabled={disabled || Boolean(uploadingType)}
          onClick={() => setUploadDialogOpen(true)}
          sx={{ borderRadius: 999, px: 2.25 }}
        >
          {uploadingType ? "Uploading..." : "Upload Photo"}
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center", ml: 0.5 }}>
          This stage · Before: {beforeCount} · After: {afterCount}
        </Typography>
      </Stack>

      <Dialog
        open={uploadDialogOpen}
        onClose={() => !uploadingType && setUploadDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Upload Photo</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Choose the photo details first, then select a saved photo or take a new one.
            </Typography>
            <FormControl fullWidth disabled={disabled || Boolean(uploadingType)}>
              <InputLabel id={`photo-type-${stage}`}>Photo type</InputLabel>
              <Select
                labelId={`photo-type-${stage}`}
                label="Photo type"
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
              >
                <MenuItem value="before">Before</MenuItem>
                <MenuItem value="after">After</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth disabled={disabled || Boolean(uploadingType)}>
              <InputLabel id={`photo-area-${stage}`}>Body part</InputLabel>
              <Select
                labelId={`photo-area-${stage}`}
                label="Body part"
                value={bodyArea}
                onChange={(e) => setBodyArea(e.target.value)}
              >
                {BODY_AREA_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>
                    {o.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth disabled={disabled || Boolean(uploadingType)}>
              <InputLabel id={`photo-side-${stage}`}>Side</InputLabel>
              <Select
                labelId={`photo-side-${stage}`}
                label="Side"
                value={side}
                onChange={(e) => setSide(e.target.value)}
              >
                <MenuItem value="">
                  <em>No left/right side</em>
                </MenuItem>
                <MenuItem value="left">Left</MenuItem>
                <MenuItem value="right">Right</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, flexWrap: "wrap" }}>
          <Button disabled={Boolean(uploadingType)} onClick={() => setUploadDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="outlined"
            component="label"
            disabled={disabled || Boolean(uploadingType)}
          >
            Choose Photo
            <input
              hidden
              type="file"
              accept="image/*,image/heic,image/heif,.heic,.heif"
              onChange={(e) => {
                handleFile(uploadType, e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </Button>
          <Button
            variant="contained"
            component="label"
            disabled={disabled || Boolean(uploadingType)}
          >
            Take Photo
            <input
              hidden
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                handleFile(uploadType, e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
