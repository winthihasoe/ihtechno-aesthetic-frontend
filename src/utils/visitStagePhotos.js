/** @typedef {'consultation' | 'preparation' | 'treatment'} VisitPhotoStage */

const LEGACY_STAGE = "consultation";

/**
 * @param {unknown} photos
 * @param {VisitPhotoStage} stage
 */
export function stageHasBeforeAndAfter(photos, stage) {
  const list = Array.isArray(photos) ? photos : [];
  const forStage = list.filter((p) => {
    const s = p?.stage || LEGACY_STAGE;
    return s === stage;
  });
  const hasBefore = forStage.some((p) => p?.type === "before");
  const hasAfter = forStage.some((p) => p?.type === "after");
  return hasBefore && hasAfter;
}

/** @param {string | undefined} status @returns {VisitPhotoStage | null} */
export function stageForVisitStatus(status) {
  if (status === "consulting") return "consultation";
  if (status === "preparation") return "preparation";
  if (status === "treatment") return "treatment";
  return null;
}

const STAGE_LABEL = {
  consultation: "Consultation",
  preparation: "Pre-treatment",
  treatment: "Treatment",
};

/**
 * If the stage already has before+after photos, returns { ok: true, payload: {} }.
 * Otherwise prompts and returns payload with acknowledge_missing_photos when user confirms.
 *
 * @param {{ askConfirm: (o: object) => Promise<boolean>, photos: unknown, stage: VisitPhotoStage }} args
 * @returns {Promise<{ ok: boolean, payload: Record<string, boolean> }>}
 */
export async function confirmIfMissingStagePhotos({ askConfirm, photos, stage }) {
  if (stageHasBeforeAndAfter(photos, stage)) {
    return { ok: true, payload: {} };
  }
  const approved = await askConfirm({
    title: "Before/after photos missing",
    message: `This visit does not have both a before and an after photo for the ${STAGE_LABEL[stage] ?? stage} stage. Continue without them?`,
    confirmText: "Continue without photos",
    cancelText: "Cancel",
  });
  if (!approved) {
    return { ok: false, payload: {} };
  }
  return { ok: true, payload: { acknowledge_missing_photos: true } };
}
