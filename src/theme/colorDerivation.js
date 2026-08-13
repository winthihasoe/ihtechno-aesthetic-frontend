/**
 * Derive accent colors for dark UI from arbitrary brand hex values.
 * Ensures filled surfaces have WCAG-friendly contrast with the chosen foreground.
 */

function hexToRgb(hex) {
  const n = parseInt(String(hex).replace(/^#/, ""), 16);
  if (Number.isNaN(n)) return [127, 127, 127];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r, g, b) {
  const h = (n) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h;
  let s;
  const l = (max + min) / 2;

  if (max === min) {
    h = 0;
    s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  if (s === 0) {
    const x = Math.round(l * 255);
    return [x, x, x];
  }
  const hue2rgb = (p, q, t) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

function relativeLuminance(rgb) {
  const linear = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(rgbA, rgbB) {
  const L1 = relativeLuminance(rgbA);
  const L2 = relativeLuminance(rgbB);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

const WHITE = [255, 255, 255];
const NEAR_BLACK = [18, 18, 30];

/**
 * Returns { main, contrastText } for MUI palette (e.g. primary) in dark mode.
 */
export function deriveMainPaletteColor(hex) {
  const { h, s: inputS } = rgbToHsl(...hexToRgb(hex));
  const s = Math.min(1, Math.max(0.3, inputS * 1.1));

  const darkBackground = hexToRgb("#0d1117");
  const targetTextRatio = 4.5;
  const targetBgRatio = 3;

  let best = null;
  let bestScore = -Infinity;

  // In dark mode, prefer a more luminous primary so action surfaces don't fade.
  for (let l = 0.78; l >= 0.28; l -= 0.01) {
    const rgb = hslToRgb(h, s, l);
    const ratioW = contrastRatio(rgb, WHITE);
    const ratioK = contrastRatio(rgb, NEAR_BLACK);
    const ratioBg = contrastRatio(rgb, darkBackground);

    const contrastText = ratioW >= ratioK ? "#ffffff" : "#0d1117";
    const textRatio = Math.max(ratioW, ratioK);

    if (textRatio < targetTextRatio || ratioBg < targetBgRatio) continue;

    const score = ratioBg + l * 0.35;
    if (score > bestScore) {
      best = { main: rgbToHex(...rgb), contrastText };
      bestScore = score;
    }
  }

  if (best) return best;

  // Fallback: keep the brand hue/sat and return safest foreground.
  const fallbackRgb = hslToRgb(h, s, 0.62);
  return contrastRatio(fallbackRgb, WHITE) >= contrastRatio(fallbackRgb, NEAR_BLACK)
    ? { main: rgbToHex(...fallbackRgb), contrastText: "#ffffff" }
    : { main: rgbToHex(...fallbackRgb), contrastText: "#0d1117" };
}

/**
 * Sidebar / chip-style accent: visible on dark grey, with readable label.
 */
export function deriveSurfaceAccentPair(hex) {
  const { main, contrastText } = deriveMainPaletteColor(hex);
  const rgb = hexToRgb(main);
  const onWhite = contrastRatio(rgb, WHITE);
  if (onWhite >= 4.5 && relativeLuminance(rgb) > 0.55) {
    return { bg: main, fg: "#0d1117" };
  }
  return { bg: main, fg: contrastText };
}
