/** @typedef {'consultation' | 'preparation' | 'treatment'} VisitPhotoStage */

export const STAGE_ORDER = ["consultation", "preparation", "treatment"];

export const STAGE_LABELS = {
  consultation: "Consultation",
  preparation: "Pre-treatment",
  treatment: "Treatment",
};

/** Value → display label for body / treatment area */
export const BODY_AREA_LABELS = {
  face: "Face",
  forehead: "Forehead",
  temple: "Temple",
  nose: "Nose",
  cheek: "Cheek",
  chin: "Chin",
  jawline: "Jawline",
  neck_front: "Neck (front)",
  neck_back: "Neck (back)",
  axilla: "Axilla",
  arm: "Arm",
  forearm: "Forearm",
  upper_arm: "Upper arm",
  hand: "Hand (single)",
  abdomen: "Abdomen",
  flank: "Flank",
  thigh: "Thigh",
  calf: "Calf",
  belly: "Belly",
  back: "Back",
  neck: "Neck",
  arms: "Arms",
  axilla: "Axilla",
  legs: "Legs",
  chest: "Chest",
  hands: "Hands",
  feet: "Feet",
  full_body: "Full body",
  genital: "Genital",
  other: "Other",
  unspecified: "Unspecified",
};

export const SIDE_LABELS = {
  left: "Left",
  right: "Right",
};

/** @type {{ value: string, label: string }[]} */
export const BODY_AREA_OPTIONS = Object.keys(BODY_AREA_LABELS).map((value) => ({
  value,
  label: BODY_AREA_LABELS[value],
}));

const LEGACY_STAGE = "consultation";

/** @param {Record<string, unknown> | undefined} p */
export function resolvedPhotoStage(p) {
  return p?.stage || LEGACY_STAGE;
}

/** @param {VisitPhotoStage | string} stage */
export function stageOrderIndex(stage) {
  const i = STAGE_ORDER.indexOf(stage);
  return i === -1 ? 0 : i;
}

/**
 * Photos captured in workflow steps before the current column (e.g. consultation
 * shots visible while in pre-treatment).
 *
 * @param {unknown} photos
 * @param {VisitPhotoStage} currentStage
 */
export function photosFromEarlierStages(photos, currentStage) {
  const list = Array.isArray(photos) ? photos : [];
  const cur = stageOrderIndex(currentStage);
  return list.filter((p) => stageOrderIndex(resolvedPhotoStage(p)) < cur);
}

/**
 * @param {unknown} photos
 * @param {VisitPhotoStage} stage
 */
export function photosForStage(photos, stage) {
  const list = Array.isArray(photos) ? photos : [];
  return list.filter((p) => resolvedPhotoStage(p) === stage);
}

/**
 * Short caption under a thumbnail (no stage — used under “this stage” grid).
 * @param {Record<string, unknown> | undefined} p
 */
export function shortVisitPhotoCaption(p) {
  if (!p) return "";
  const type = p.type === "after" ? "After" : "Before";
  const area = BODY_AREA_LABELS[p.body_area] || p.body_area || "—";
  const side = p.side ? ` · ${SIDE_LABELS[p.side] || p.side}` : "";
  return `${type} · ${area}${side}`;
}

/**
 * Full caption for tooltips / earlier-stage badges (includes workflow stage).
 * @param {Record<string, unknown> | undefined} p
 */
export function fullVisitPhotoCaption(p) {
  if (!p) return "";
  const st = STAGE_LABELS[resolvedPhotoStage(p)] || resolvedPhotoStage(p);
  return `${st} · ${shortVisitPhotoCaption(p)}`;
}
