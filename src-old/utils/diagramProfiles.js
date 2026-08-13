export const DIAGRAM_OPTIONS = [
  { key: "female_front", label: "Female front", src: "/images/diagrams/female-front.png", gender: "female" },
  { key: "female_left", label: "Female left", src: "/images/diagrams/female-left.png", gender: "female" },
  { key: "female_right", label: "Female right", src: "/images/diagrams/female-right.png", gender: "female" },
  { key: "male_front", label: "Male front", src: "/images/diagrams/male-front.png", gender: "male" },
  { key: "male_left", label: "Male left", src: "/images/diagrams/male-left.png", gender: "male" },
  { key: "male_right", label: "Male right", src: "/images/diagrams/male-right.png", gender: "male" },
  { key: "axilla", label: "Axilla", src: "/images/diagrams/axilla.png" },
  { key: "perineal", label: "Perineal", src: "/images/diagrams/perineal.jpg" },
];

export const DIAGRAM_OPTION_BY_KEY = Object.fromEntries(
  DIAGRAM_OPTIONS.map((item) => [item.key, item]),
);

export function resolveDefaultDiagramKeyByGender(genderRaw) {
  const gender = String(genderRaw || "").trim().toLowerCase();
  if (gender.includes("female")) return "female_front";
  if (gender.includes("male")) return "male_front";
  return "female_front";
}

/**
 * Pick the map target that best matches existing annotations (most recent first).
 * Falls back to the gender-default face diagram when there are no annotations.
 */
export function resolvePreferredMapTarget(
  mapPoints,
  defaultDiagramKey,
  photoOptions = [],
) {
  const fallback = `diagram:${defaultDiagramKey}`;
  if (!Array.isArray(mapPoints) || mapPoints.length === 0) return fallback;

  const photoIds = new Set(
    (photoOptions || [])
      .map((photo) => Number(photo?.id))
      .filter((id) => Number.isFinite(id)),
  );

  const sorted = [...mapPoints].sort((a, b) => Number(b.id) - Number(a.id));
  for (const point of sorted) {
    if (point.photo_id != null) {
      const photoId = Number(point.photo_id);
      if (photoIds.has(photoId)) return `photo:${photoId}`;
      continue;
    }
    const diagramKey = String(point.diagram_key || defaultDiagramKey);
    if (DIAGRAM_OPTION_BY_KEY[diagramKey]) return `diagram:${diagramKey}`;
  }

  return fallback;
}

