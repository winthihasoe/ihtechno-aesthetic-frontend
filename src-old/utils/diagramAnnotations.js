export const ANNOTATION_TYPES = {
  POINT: "point",
  PATH: "path",
  TEXT: "text",
};

export const MAP_TOOLS = {
  INJECTION: "injection",
  INCISION: "incision",
  SUTURE: "suture",
  TEXT: "text",
};

const FACE_ZONE_LABELS = [
  { value: "Forehead", x: 0.5, y: 0.2 },
  { value: "Glabella", x: 0.5, y: 0.3 },
  { value: "Left temple", x: 0.28, y: 0.3 },
  { value: "Right temple", x: 0.72, y: 0.3 },
  { value: "Nose bridge", x: 0.5, y: 0.42 },
  { value: "Left cheek", x: 0.35, y: 0.5 },
  { value: "Right cheek", x: 0.65, y: 0.5 },
  { value: "Perioral", x: 0.5, y: 0.62 },
  { value: "Chin", x: 0.5, y: 0.74 },
  { value: "Jawline left", x: 0.36, y: 0.72 },
  { value: "Jawline right", x: 0.64, y: 0.72 },
];

const AXILLA_ZONE_LABELS = [
  { value: "Left axilla", x: 0.3, y: 0.5 },
  { value: "Right axilla", x: 0.7, y: 0.5 },
  { value: "Central axilla", x: 0.5, y: 0.5 },
  { value: "Upper", x: 0.5, y: 0.25 },
  { value: "Lower", x: 0.5, y: 0.75 },
];

const PERINEAL_ZONE_LABELS = [
  { value: "Anterior", x: 0.5, y: 0.25 },
  { value: "Posterior", x: 0.5, y: 0.75 },
  { value: "Left", x: 0.25, y: 0.5 },
  { value: "Right", x: 0.75, y: 0.5 },
  { value: "Central", x: 0.5, y: 0.5 },
];

export function clamp01(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}

export function resolveZoneLabelsForDiagram(diagramKey) {
  if (diagramKey === "axilla") return AXILLA_ZONE_LABELS;
  if (diagramKey === "perineal") return PERINEAL_ZONE_LABELS;
  return FACE_ZONE_LABELS;
}

export function nearestZoneLabel(x, y, diagramKey) {
  const zones = resolveZoneLabelsForDiagram(diagramKey);
  let best = zones[0]?.value || "Point";
  let bestDistance = Number.POSITIVE_INFINITY;
  zones.forEach((zone) => {
    const dx = Number(x) - zone.x;
    const dy = Number(y) - zone.y;
    const distance = Math.hypot(dx, dy);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = zone.value;
    }
  });
  return best;
}

export function normalizePathPoint(point) {
  if (Array.isArray(point) && point.length >= 2) {
    return [clamp01(point[0]), clamp01(point[1])];
  }
  if (point && typeof point === "object" && "x" in point && "y" in point) {
    return [clamp01(point.x), clamp01(point.y)];
  }
  return null;
}

export function normalizePathPoints(points) {
  if (!Array.isArray(points)) return [];
  return points.map(normalizePathPoint).filter(Boolean);
}

export function minifyPathPoints(points, minDistance = 0.005) {
  const normalized = normalizePathPoints(points);
  if (normalized.length === 0) return [];
  const result = [normalized[0]];
  for (let i = 1; i < normalized.length; i += 1) {
    const prev = result[result.length - 1];
    const curr = normalized[i];
    const dx = curr[0] - prev[0];
    const dy = curr[1] - prev[1];
    if (Math.hypot(dx, dy) >= minDistance) {
      result.push(curr);
    }
  }
  if (result.length === 1 && normalized.length > 1) {
    result.push(normalized[normalized.length - 1]);
  }
  return result;
}

export function pointsToSvgPath(points) {
  if (!Array.isArray(points) || points.length < 2) return "";
  const [first, ...rest] = points;
  const startX = clamp01(first[0]) * 100;
  const startY = clamp01(first[1]) * 100;
  const segments = rest
    .map(([x, y]) => `L ${clamp01(x) * 100} ${clamp01(y) * 100}`)
    .join(" ");
  return `M ${startX} ${startY} ${segments}`;
}

export function resolveAnnotationType(point) {
  const raw = String(point?.annotation_type || ANNOTATION_TYPES.POINT).toLowerCase();
  if (raw === ANNOTATION_TYPES.PATH || raw === ANNOTATION_TYPES.TEXT) return raw;
  return ANNOTATION_TYPES.POINT;
}

export function resolvePathStyle(point) {
  const style = String(point?.geometry?.style || "").toLowerCase();
  if (style === MAP_TOOLS.SUTURE) return MAP_TOOLS.SUTURE;
  return MAP_TOOLS.INCISION;
}

export function pathStrokeProps(style) {
  if (style === MAP_TOOLS.SUTURE) {
    return {
      stroke: "#1565c0",
      strokeWidth: 2,
      strokeDasharray: "6 4",
      fill: "none",
      strokeLinecap: "round",
      strokeLinejoin: "round",
    };
  }
  return {
    stroke: "#c62828",
    strokeWidth: 2.5,
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
}

export function extractLabelAndNote(rawNote) {
  const text = String(rawNote ?? "").trim();
  const match = text.match(/^\[([^\]]+)\]\s*(.*)$/);
  if (!match) return { label: "", note: text };
  return {
    label: String(match[1] || "").trim(),
    note: String(match[2] || "").trim(),
  };
}

export function composeLabelledNote(label, note) {
  const trimmedLabel = String(label ?? "").trim();
  const trimmedNote = String(note ?? "").trim();
  if (!trimmedLabel) return trimmedNote || null;
  return trimmedNote ? `[${trimmedLabel}] ${trimmedNote}` : `[${trimmedLabel}]`;
}
