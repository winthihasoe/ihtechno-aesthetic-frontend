import { useEffect, useRef, useState } from "react";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Button,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import DrawOutlinedIcon from "@mui/icons-material/DrawOutlined";
import ContentCutOutlinedIcon from "@mui/icons-material/ContentCutOutlined";
import MediationOutlinedIcon from "@mui/icons-material/MediationOutlined";
import TextFieldsOutlinedIcon from "@mui/icons-material/TextFieldsOutlined";
import {
  MAP_TOOLS,
  clamp01,
  minifyPathPoints,
  pathStrokeProps,
  pointsToSvgPath,
} from "../../utils/diagramAnnotations";
import DiagramAnnotationLayer from "./DiagramAnnotationLayer";

function normalizePointerPosition(event, rect) {
  return {
    x: clamp01((event.clientX - rect.left) / rect.width),
    y: clamp01((event.clientY - rect.top) / rect.height),
  };
}

const TOOL_OPTIONS = [
  { value: MAP_TOOLS.INJECTION, label: "Injection", Icon: DrawOutlinedIcon },
  {
    value: MAP_TOOLS.INCISION,
    label: "Incision",
    Icon: ContentCutOutlinedIcon,
  },
  { value: MAP_TOOLS.SUTURE, label: "Suture", Icon: MediationOutlinedIcon },
  { value: MAP_TOOLS.TEXT, label: "Text", Icon: TextFieldsOutlinedIcon },
];

export default function TreatmentDiagramCanvas({
  imageUrl,
  imageAlt,
  diagramLoadError,
  isDiagramTarget,
  editable,
  activeTool,
  annotations,
  pointNumberById,
  selectedId,
  pendingClick,
  draftPathPoints,
  onToolChange,
  onInjectionClick,
  onPathComplete,
  onTextPlace,
  onSelect,
  onDiagramLoad,
  onDiagramError,
  emptyMessage,
  preservePhotoAspect = false,
  surfaceMaxWidth,
  compact = false,
}) {
  const surfaceRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [livePath, setLivePath] = useState([]);
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [pendingTextPos, setPendingTextPos] = useState(null);
  const [textDraft, setTextDraft] = useState("");
  const [imageRatio, setImageRatio] = useState(null);

  useEffect(() => {
    setImageRatio(null);
  }, [imageUrl]);

  const showToolPalette = editable && onToolChange;
  // Box always matches the media's true aspect ratio so normalized marks
  // (0..1) line up identically across preview and editor. Diagrams stay 1:1.
  const ratio = preservePhotoAspect && imageRatio ? imageRatio : 1;
  // Bound the box by WIDTH only; height derives from the aspect ratio, so the
  // ratio can never be distorted by a height cap.
  const sizeSx = compact
    ? { maxWidth: `min(100%, ${Math.round(240 * ratio)}px)` }
    : {
        maxWidth: {
          xs: `min(100%, calc(58vh * ${ratio}))`,
          md: `min(${surfaceMaxWidth || 480}px, calc(70vh * ${ratio}))`,
        },
      };

  const handlePointerDown = (event) => {
    if (!editable || !surfaceRef.current) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    const pos = normalizePointerPosition(event, rect);

    if (activeTool === MAP_TOOLS.INJECTION) {
      onInjectionClick?.(pos);
      return;
    }

    if (activeTool === MAP_TOOLS.TEXT) {
      setPendingTextPos(pos);
      setTextDraft("");
      setTextDialogOpen(true);
      return;
    }

    if (activeTool === MAP_TOOLS.INCISION || activeTool === MAP_TOOLS.SUTURE) {
      event.currentTarget.setPointerCapture(event.pointerId);
      setDrawing(true);
      setLivePath([[pos.x, pos.y]]);
    }
  };

  const handlePointerMove = (event) => {
    if (!drawing || !surfaceRef.current) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    const pos = normalizePointerPosition(event, rect);
    setLivePath((prev) => minifyPathPoints([...prev, [pos.x, pos.y]]));
  };

  const finishDrawing = () => {
    if (!drawing) return;
    setDrawing(false);
    const minified = minifyPathPoints(livePath);
    setLivePath([]);
    if (minified.length >= 2) {
      onPathComplete?.({
        points: minified,
        style:
          activeTool === MAP_TOOLS.SUTURE
            ? MAP_TOOLS.SUTURE
            : MAP_TOOLS.INCISION,
      });
    }
  };

  const handlePointerUp = (event) => {
    if (!drawing) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    finishDrawing();
  };

  const handleTextSave = () => {
    const text = String(textDraft || "").trim();
    if (!text || !pendingTextPos) {
      setTextDialogOpen(false);
      setPendingTextPos(null);
      return;
    }
    onTextPlace?.({ ...pendingTextPos, text });
    setTextDialogOpen(false);
    setPendingTextPos(null);
    setTextDraft("");
  };

  const cursor =
    editable &&
    (activeTool === MAP_TOOLS.INCISION || activeTool === MAP_TOOLS.SUTURE)
      ? "crosshair"
      : editable
        ? "crosshair"
        : "default";

  const displayPath = drawing
    ? livePath
    : draftPathPoints?.length >= 2
      ? draftPathPoints
      : null;

  return (
    <>
      <Box
        ref={surfaceRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={finishDrawing}
        onPointerCancel={finishDrawing}
        sx={{
          position: "relative",
          width: "100%",
          mx: "auto",
          aspectRatio: ratio,
          ...sizeSx,
          borderRadius: 1,
          border: 1,
          borderColor: "divider",
          overflow: "hidden",
          cursor,
          bgcolor: "grey.100",
          touchAction: "none",
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
          boxShadow: (theme) =>
            theme.palette.mode === "dark"
              ? "inset 0 0 0 1px rgba(255,255,255,0.06)"
              : "inset 0 0 0 1px rgba(0,0,0,0.04)",
        }}
      >
        {showToolPalette && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 3,
              bgcolor: "background.paper",
              borderBottom: 1,
              borderColor: "divider",
              boxShadow: 1,
              px: { xs: 0.5, sm: 0.75 },
              py: { xs: 0.35, sm: 0.5 },
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <ToggleButtonGroup
              exclusive
              size="small"
              value={activeTool}
              onChange={(_, value) => {
                if (value) onToolChange(value);
              }}
              sx={{
                width: "100%",
                display: "flex",
                "& .MuiToggleButton-root": {
                  flex: 1,
                  px: { xs: 0.5, sm: 1.25 },
                  py: 0.5,
                  gap: 0.5,
                  border: 0,
                  borderRadius: "8px !important",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "none",
                  minWidth: 0,
                },
              }}
            >
              {TOOL_OPTIONS.map(({ value, label, Icon }) => (
                <ToggleButton key={value} value={value}>
                  <Icon sx={{ fontSize: { xs: 15, sm: 16 } }} />
                  <Box
                    component="span"
                    sx={{
                      display: { xs: "none", sm: "inline" },
                      ml: 0.25,
                    }}
                  >
                    {label}
                  </Box>
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>
        )}

        {imageUrl && !(isDiagramTarget && diagramLoadError) ? (
          <Box
            component="img"
            src={imageUrl}
            alt={imageAlt}
            onLoad={(event) => {
              const img = event.currentTarget;
              if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                setImageRatio(img.naturalWidth / img.naturalHeight);
              }
              onDiagramLoad?.();
            }}
            onError={() => onDiagramError?.()}
            sx={{
              width: "100%",
              height: "100%",
              // Once the box matches the media ratio, "fill" maps pixels exactly
              // to the box so marks align. Diagrams (and pre-load) use contain.
              objectFit: preservePhotoAspect && imageRatio ? "fill" : "contain",
              display: "block",
              pointerEvents: "none",
              userSelect: "none",
              bgcolor: "grey.50",
            }}
          />
        ) : (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "grid",
              placeItems: "center",
              px: 2,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              textAlign="center"
            >
              {emptyMessage}
            </Typography>
          </Box>
        )}

        <DiagramAnnotationLayer
          annotations={annotations}
          pointNumberById={pointNumberById}
          selectedId={selectedId}
          interactive={editable}
          onSelect={onSelect}
        />

        {displayPath?.length >= 2 && (
          <Box
            component="svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
            }}
          >
            <Box
              component="path"
              d={pointsToSvgPath(displayPath)}
              sx={{
                ...pathStrokeProps(
                  activeTool === MAP_TOOLS.SUTURE
                    ? MAP_TOOLS.SUTURE
                    : MAP_TOOLS.INCISION,
                ),
                vectorEffect: "non-scaling-stroke",
              }}
            />
          </Box>
        )}

        {pendingClick && editable && (
          <Box
            sx={{
              position: "absolute",
              left: `${pendingClick.x * 100}%`,
              top: `${pendingClick.y * 100}%`,
              width: 14,
              height: 14,
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              border: "2px dashed",
              borderColor: "warning.main",
              bgcolor: "rgba(255,255,255,0.45)",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />
        )}
      </Box>

      <Dialog
        open={textDialogOpen}
        onClose={() => {
          setTextDialogOpen(false);
          setPendingTextPos(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Label on diagram</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Text"
            value={textDraft}
            onChange={(e) => setTextDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTextSave();
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setTextDialogOpen(false);
              setPendingTextPos(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleTextSave}
            disabled={!textDraft.trim()}
          >
            Place text
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
