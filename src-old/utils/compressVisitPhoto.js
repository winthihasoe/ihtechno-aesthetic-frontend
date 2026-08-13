/**
 * Resize and re-encode visit photos (before/after) as JPEG to reduce upload size.
 * HEIC/HEIF is converted to JPEG first (see prepareVisitPhotoForUpload).
 */

const DEFAULT_MAX = 1280;
const DEFAULT_QUALITY = 0.72;

/** @param {File} file */
function isHeicLike(file) {
  const t = (file.type || "").toLowerCase();
  const n = (file.name || "").toLowerCase();
  return (
    t.includes("heic") ||
    t.includes("heif") ||
    /\.(heic|heif)$/i.test(n)
  );
}

/**
 * Convert Apple HEIC/HEIF to JPEG in the browser (canvas cannot decode HEIC).
 * @param {File} file
 * @returns {Promise<File>}
 */
async function convertHeicToJpegIfNeeded(file) {
  if (!file || !isHeicLike(file)) {
    return file;
  }
  const heic2any = (await import("heic2any")).default;
  const result = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.85,
  });
  const blob = Array.isArray(result) ? result[0] : result;
  if (!blob || !(blob instanceof Blob)) {
    throw new Error("HEIC conversion produced no image.");
  }
  const base = (file.name || "photo").replace(/\.(heic|heif)$/i, "") || "photo";
  return new File([blob], `${base}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

/**
 * HEIC → JPEG (if needed), then resize/compress for upload.
 * @param {File} file
 * @param {{ maxDimension?: number, quality?: number }} [options]
 * @returns {Promise<File>}
 */
export async function prepareVisitPhotoForUpload(file, options = {}) {
  const normalized = await convertHeicToJpegIfNeeded(file);
  return compressVisitPhotoFile(normalized, options);
}

/**
 * @param {File} file
 * @param {{ maxDimension?: number, quality?: number }} [options]
 * @returns {Promise<File>}
 */
export async function compressVisitPhotoFile(file, options = {}) {
  if (!file?.type?.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  const maxDim = options.maxDimension ?? DEFAULT_MAX;
  const quality = options.quality ?? DEFAULT_QUALITY;

  const img = new Image();
  const url = URL.createObjectURL(file);

  try {
    await new Promise((resolve, reject) => {
      img.onload = () => resolve(null);
      img.onerror = () => reject(new Error("decode"));
      img.src = url;
    });
  } catch {
    URL.revokeObjectURL(url);
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }

  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (w <= 0 || h <= 0) {
    return file;
  }

  const scale = Math.min(1, maxDim / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return file;
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, tw, th);
  ctx.drawImage(img, 0, 0, tw, th);

  const blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
  });

  if (!blob || blob.size === 0) {
    return file;
  }

  if (blob.size >= file.size && file.size < 400_000) {
    return file;
  }

  const base = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}
