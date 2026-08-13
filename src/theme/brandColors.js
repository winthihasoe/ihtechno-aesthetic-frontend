/** Canonical brand palette — keep in sync with backend AppSetting defaults. */
export const BRAND_COLORS = {
  primary: "#209da1",
  secondary: "#e8e9eb",
  background: "#dadbd3",
  primaryLight: "#4db8bc",
  primaryDark: "#167a7e",
  secondaryLight: "#f5f6f7",
  secondaryDark: "#cbced2",
  sidebarAccent: "#209da1",
  textOnBackground: "#1e3d3e",
  textOnBackgroundMuted: "rgba(30, 61, 62, 0.72)",
  textOnPrimary: "#ffffff",
};

export const BRAND_RGB = {
  primary: [32, 157, 161],
  secondary: [232, 233, 235],
  background: [218, 219, 211],
  text: [30, 61, 62],
};

/** @param {"primary"|"secondary"|"background"|"text"} channel */
export function brandRgba(channel, alpha) {
  const [r, g, b] = BRAND_RGB[channel];
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** White-forward gradient for the main workspace outlet (scroll area). */
export function getOutletBackgroundLight() {
  return [
    `radial-gradient(ellipse 95% 60% at 50% -6%, rgba(255,255,255,0.99), transparent 70%)`,
    `radial-gradient(ellipse 55% 45% at 100% 100%, ${brandRgba("secondary", 0.2)}, transparent 58%)`,
    `radial-gradient(ellipse 45% 38% at 0% 100%, ${brandRgba("primary", 0.06)}, transparent 54%)`,
    `linear-gradient(180deg, #ffffff 0%, #fcfcfb 35%, #f6f7f4 65%, ${BRAND_COLORS.background} 100%)`,
  ].join(", ");
}

/**
 * Login auth screen wash — same brand tokens as the app shell, with a
 * slightly stronger primary tint so the page feels intentional.
 */
export function getLoginBackgroundLight() {
  return [
    `radial-gradient(ellipse 90% 55% at 50% -8%, rgba(255,255,255,0.98), transparent 68%)`,
    `radial-gradient(circle at 12% 18%, ${brandRgba("secondary", 0.32)}, transparent 38%)`,
    `radial-gradient(circle at 88% 10%, ${brandRgba("primary", 0.14)}, transparent 34%)`,
    `radial-gradient(circle at 78% 86%, ${brandRgba("primary", 0.1)}, transparent 42%)`,
    `radial-gradient(ellipse 50% 40% at 0% 100%, ${brandRgba("primary", 0.08)}, transparent 55%)`,
    `linear-gradient(135deg, #f8f9f7 0%, ${BRAND_COLORS.background} 52%, ${BRAND_COLORS.secondaryLight} 100%)`,
  ].join(", ");
}

/** Same clinical SVG motifs as CssBaseline body decoration in theme.js. */
export const LOGIN_CLINICAL_ICON_LAYER_A =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23e8e9eb' stroke-width='2.2' stroke-linecap='round'%3E%3Cpath d='M60 36v18M60 66v18M42 60h18M66 60h18'/%3E%3C/g%3E%3C/svg%3E\"), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M60 83c-15-9-24-17-24-29 0-8 6-14 14-14 5 0 9 2 10 6 1-4 5-6 10-6 8 0 14 6 14 14 0 12-9 20-24 29Z' fill='none' stroke='%234db8bc' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";

export const LOGIN_CLINICAL_ICON_LAYER_B =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23209da1' stroke-width='2.1' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M30 66h14l8-16 10 28 8-16h20'/%3E%3Ccircle cx='60' cy='60' r='26'/%3E%3C/g%3E%3C/svg%3E\"), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23cbced2' stroke-width='2.1' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M50 76V46M70 76V46'/%3E%3Cpath d='M40 46h40v30H40z'/%3E%3Cpath d='M80 56h8'/%3E%3C/g%3E%3C/svg%3E\")";
