import { Box } from "@mui/material";
import {
  ANNOTATION_TYPES,
  clamp01,
  pathStrokeProps,
  pointsToSvgPath,
  resolveAnnotationType,
  resolvePathStyle,
} from "../../utils/diagramAnnotations";

export default function DiagramAnnotationLayer({
  annotations,
  pointNumberById = new Map(),
  selectedId = null,
  interactive = false,
  onSelect,
}) {
  return (
    <Box
      component="svg"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      sx={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        // Root must stay non-interactive so empty canvas areas receive touch/pointer
        // events on mobile; individual shapes set their own pointerEvents below.
        pointerEvents: "none",
      }}
    >
      {annotations.map((item) => {
        const type = resolveAnnotationType(item);
        const isSelected = Number(selectedId) === Number(item.id);

        if (type === ANNOTATION_TYPES.PATH) {
          const points = item.geometry?.points;
          if (!Array.isArray(points) || points.length < 2) return null;
          const stroke = pathStrokeProps(resolvePathStyle(item));
          return (
            <Box
              key={item.id}
              component="path"
              d={pointsToSvgPath(points)}
              onClick={
                interactive
                  ? (e) => {
                      e.stopPropagation();
                      onSelect?.(item);
                    }
                  : undefined
              }
              sx={{
                ...stroke,
                vectorEffect: "non-scaling-stroke",
                pointerEvents: interactive ? "stroke" : "none",
                opacity: isSelected ? 1 : 0.9,
              }}
            />
          );
        }

        if (type === ANNOTATION_TYPES.TEXT) {
          const text = String(item.geometry?.text || "").trim();
          if (!text) return null;
          return (
            <Box
              key={item.id}
              component="text"
              x={clamp01(item.x_position) * 100}
              y={clamp01(item.y_position) * 100}
              onClick={
                interactive
                  ? (e) => {
                      e.stopPropagation();
                      onSelect?.(item);
                    }
                  : undefined
              }
              sx={{
                fill: isSelected ? "#b71c1c" : "#1a237e",
                fontSize: 3.2,
                fontWeight: 700,
                pointerEvents: interactive ? "all" : "none",
                userSelect: "none",
              }}
            >
              {text}
            </Box>
          );
        }

        const idx = pointNumberById.get(Number(item.id));
        return (
          <Box
            key={item.id}
            component="circle"
            cx={clamp01(item.x_position) * 100}
            cy={clamp01(item.y_position) * 100}
            r={1.1}
            onClick={
              interactive
                ? (e) => {
                    e.stopPropagation();
                    onSelect?.(item);
                  }
                : undefined
            }
            sx={{
              fill: isSelected ? "#d32f2f" : "#1976d2",
              stroke: "#fff",
              strokeWidth: 0.35,
              vectorEffect: "non-scaling-stroke",
              pointerEvents: interactive ? "all" : "none",
            }}
          />
        );
      })}
      {annotations
        .filter((item) => resolveAnnotationType(item) === ANNOTATION_TYPES.POINT)
        .map((item) => {
          const idx = pointNumberById.get(Number(item.id));
          if (!idx) return null;
          return (
            <Box
              key={`label-${item.id}`}
              component="text"
              x={clamp01(item.x_position) * 100}
              y={clamp01(item.y_position) * 100}
              textAnchor="middle"
              dominantBaseline="central"
              sx={{
                fill: "#fff",
                fontSize: 2.4,
                fontWeight: 700,
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              {idx}
            </Box>
          );
        })}
    </Box>
  );
}
