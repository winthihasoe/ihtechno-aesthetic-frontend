import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ProductPickerMenuItem from "../inventory/ProductPickerMenuItem";
import TreatmentDiagramCanvas from "./TreatmentDiagramCanvas";
import {
  ANNOTATION_TYPES,
  MAP_TOOLS,
  resolveAnnotationType,
  resolvePathStyle,
  extractLabelAndNote,
} from "../../utils/diagramAnnotations";

export default function TreatmentMapEditorDialog({
  open,
  onClose,
  title,
  subtitle,
  imageUrl,
  imageAlt,
  isDiagramTarget,
  diagramLoadError,
  editable,
  activeTool,
  onToolChange,
  annotations,
  pointNumberById,
  selectedPointId,
  pendingClick,
  onInjectionClick,
  onPathComplete,
  onTextPlace,
  onSelectAnnotation,
  onDiagramLoad,
  onDiagramError,
  emptyMessage,
  isInjectionSelection,
  mapAnatomyLabel,
  onMapAnatomyLabelChange,
  mapNote,
  onMapNoteChange,
  mapUnit,
  onMapUnitChange,
  mapProductId,
  onMapProductIdChange,
  zoneLabelOptions,
  productOptions,
  onUpdateSelected,
  onResetDraft,
  onDeletePoint,
  savingPoint,
  sessionId,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const canvasTitle = isDiagramTarget ? "Body diagram" : "Treatment photo";

  return (
    <Dialog
      open={open}
      onClose={savingPoint ? undefined : onClose}
      fullScreen={isMobile}
      fullWidth
      maxWidth="md"
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          overflow: "hidden",
          ...(isMobile
            ? {
                display: "flex",
                flexDirection: "column",
              }
            : {}),
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          py: { xs: 1, sm: 1.5 },
          px: { xs: 1.25, sm: 2.5 },
          borderBottom: 1,
          borderColor: "divider",
          flexShrink: 0,
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            variant={isMobile ? "subtitle1" : "h6"}
            sx={{ fontWeight: 700, lineHeight: 1.25 }}
            noWrap
          >
            {title || "Anatomical marking"}
          </Typography>
          {subtitle ? (
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              sx={{ display: "block", mt: 0.25 }}
            >
              {subtitle}
            </Typography>
          ) : null}
          <Stack
            direction="row"
            spacing={0.5}
            flexWrap="wrap"
            useFlexGap
            sx={{ mt: 0.75 }}
          >
            <Chip
              size="small"
              label={canvasTitle}
              variant="outlined"
              sx={{ height: 22, fontSize: 11 }}
            />
            {annotations.length > 0 ? (
              <Chip
                size="small"
                label={`${annotations.length} mark${annotations.length === 1 ? "" : "s"}`}
                color="primary"
                variant="outlined"
                sx={{ height: 22, fontSize: 11 }}
              />
            ) : null}
            {savingPoint ? (
              <Chip
                size="small"
                label="Saving…"
                variant="outlined"
                sx={{ height: 22, fontSize: 11 }}
              />
            ) : null}
          </Stack>
        </Box>
        <IconButton
          aria-label="Close marking editor"
          onClick={onClose}
          disabled={savingPoint}
          size="small"
          sx={{ flexShrink: 0 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          px: { xs: 2, sm: 2.5 },
          py: { xs: 1.5, sm: 2 },
          bgcolor: (t) =>
            t.palette.mode === "dark" ? "background.default" : "grey.50",
          flex: isMobile ? 1 : undefined,
          overflow: "auto",
        }}
      >
        {!editable ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              mb: 1,
              px: 1,
              py: 0.75,
              borderRadius: 1,
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
            }}
          >
            View only — this session is locked or you do not have edit access.
          </Typography>
        ) : null}

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: { xs: 1.5, md: 2 },
            alignItems: "stretch",
            mt: 2,
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <TreatmentDiagramCanvas
              imageUrl={imageUrl}
              imageAlt={imageAlt}
              diagramLoadError={diagramLoadError}
              isDiagramTarget={isDiagramTarget}
              editable={editable}
              activeTool={activeTool}
              annotations={annotations}
              pointNumberById={pointNumberById}
              selectedId={selectedPointId}
              pendingClick={
                editable && activeTool === MAP_TOOLS.INJECTION
                  ? pendingClick
                  : null
              }
              onToolChange={onToolChange}
              onInjectionClick={onInjectionClick}
              onPathComplete={onPathComplete}
              onTextPlace={onTextPlace}
              onSelect={onSelectAnnotation}
              onDiagramLoad={onDiagramLoad}
              onDiagramError={onDiagramError}
              emptyMessage={emptyMessage}
              preservePhotoAspect={!isDiagramTarget}
              surfaceMaxWidth={isDiagramTarget ? 480 : 560}
            />

            {annotations.length > 0 && (
              <Box sx={{ mt: 1.5 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 0.5, fontWeight: 600 }}
                >
                  Marks on this view
                </Typography>
                <Box
                  sx={{
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1.5,
                    bgcolor: "background.paper",
                  }}
                >
                  {annotations.map((point) => {
                    const parsed = extractLabelAndNote(point.note);
                    const annotationType = resolveAnnotationType(point);
                    const typeLabel =
                      annotationType === ANNOTATION_TYPES.PATH
                        ? resolvePathStyle(point) === MAP_TOOLS.SUTURE
                          ? "Suture"
                          : "Incision"
                        : annotationType === ANNOTATION_TYPES.TEXT
                          ? "Text"
                          : `#${pointNumberById.get(Number(point.id)) || "?"}`;
                    const summary =
                      annotationType === ANNOTATION_TYPES.TEXT
                        ? point.geometry?.text || parsed.note || "Text label"
                        : parsed.note || parsed.label || "Annotation";
                    const isSelected =
                      Number(selectedPointId) === Number(point.id);

                    return (
                      <Box
                        key={point.id}
                        onClick={() => onSelectAnnotation(point)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                          py: 0.5,
                          px: 0.75,
                          borderBottom: 1,
                          borderColor: "divider",
                          cursor: "pointer",
                          bgcolor: isSelected
                            ? "action.selected"
                            : "transparent",
                          "&:last-child": { borderBottom: 0 },
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        <Chip
                          size="small"
                          label={typeLabel}
                          color={
                            annotationType === ANNOTATION_TYPES.PATH
                              ? "error"
                              : annotationType === ANNOTATION_TYPES.TEXT
                                ? "info"
                                : "primary"
                          }
                          variant="outlined"
                          sx={{ height: 20, fontSize: 10, flexShrink: 0 }}
                        />
                        <Typography
                          variant="caption"
                          noWrap
                          sx={{ flex: 1, minWidth: 0, fontSize: 11 }}
                        >
                          {summary}
                          {point.unit ? ` · ${point.unit}` : ""}
                        </Typography>
                        {editable && (
                          <IconButton
                            size="small"
                            color="error"
                            aria-label="Delete annotation"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeletePoint(point.id);
                            }}
                            sx={{ flexShrink: 0, p: 0.25 }}
                          >
                            <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}
          </Box>

          {editable && (
            <Stack
              spacing={1}
              sx={{
                p: { xs: 1.25, sm: 1.5 },
                borderTop: { xs: 1, md: 0 },
                borderLeft: { md: 1 },
                borderColor: "divider",
                bgcolor: "background.paper",
                width: { xs: "100%", md: 260 },
                flexShrink: 0,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={700}
              >
                {isInjectionSelection ? "Injection details" : "Selected mark"}
              </Typography>
              {isInjectionSelection && (
                <>
                  <FormControl size="small" fullWidth>
                    <InputLabel id={`map-dialog-label-${sessionId}`}>
                      Anatomical label
                    </InputLabel>
                    <Select
                      labelId={`map-dialog-label-${sessionId}`}
                      label="Anatomical label"
                      value={mapAnatomyLabel}
                      onChange={(e) => onMapAnatomyLabelChange(e.target.value)}
                    >
                      {zoneLabelOptions.map((zone) => (
                        <MenuItem key={zone.value} value={zone.value}>
                          {zone.value}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Stack direction={{ xs: "row", sm: "column" }} spacing={1}>
                    <TextField
                      size="small"
                      label="Unit / dosage"
                      placeholder="e.g. Botox 4U"
                      value={mapUnit}
                      onChange={(e) => onMapUnitChange(e.target.value)}
                      sx={{ flex: 1 }}
                    />
                    <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
                      <InputLabel id={`map-dialog-product-${sessionId}`}>
                        Product
                      </InputLabel>
                      <Select
                        labelId={`map-dialog-product-${sessionId}`}
                        label="Product"
                        value={mapProductId}
                        onChange={(e) => onMapProductIdChange(e.target.value)}
                      >
                        <MenuItem value="">
                          <em>None</em>
                        </MenuItem>
                        {productOptions.map((product) => (
                          <ProductPickerMenuItem
                            key={product.id}
                            product={product}
                            value={String(product.id)}
                            selectedValue={mapProductId}
                          >
                            {product.name}
                          </ProductPickerMenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                </>
              )}
              <TextField
                size="small"
                label={isInjectionSelection ? "Point note" : "Annotation note"}
                value={mapNote}
                onChange={(e) => onMapNoteChange(e.target.value)}
              />
              <Stack direction="row" spacing={0.75}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={onUpdateSelected}
                  disabled={!selectedPointId || savingPoint}
                  sx={{ flex: 1 }}
                >
                  Update
                </Button>
                <Button
                  variant="text"
                  size="small"
                  color="inherit"
                  onClick={onResetDraft}
                  disabled={savingPoint}
                >
                  Clear
                </Button>
              </Stack>
              {!isMobile ? (
                <>
                  <Divider />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    lineHeight={1.45}
                  >
                    Sketches and text save automatically. Tap to place injection
                    points, then adjust details here.
                  </Typography>
                </>
              ) : null}
            </Stack>
          )}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 1.25, sm: 2.5 },
          py: { xs: 1, sm: 1.5 },
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          flexShrink: 0,
          gap: 1,
        }}
      >
        <Button
          variant="contained"
          onClick={onClose}
          disabled={savingPoint}
          fullWidth={isMobile}
        >
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
