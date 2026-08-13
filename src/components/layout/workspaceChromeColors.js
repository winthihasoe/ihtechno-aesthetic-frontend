import { BRAND_COLORS } from "../../theme/brandColors";

/**
 * Shared chrome colors for AppTopNav + ContextualSidebar (matches legacy Sidebar).
 * @param {boolean} isDark
 * @param {import("@mui/material/styles").Theme} [theme]
 */
export function getWorkspaceChromeColors(isDark, theme) {
  return {
    chromeBg: isDark
      ? "#0d1117"
      : `linear-gradient(170deg, ${BRAND_COLORS.primaryDark}, ${BRAND_COLORS.primary} 55%, ${BRAND_COLORS.primaryLight} 100%)`,
    titleColor: isDark
      ? (theme?.palette?.text?.primary ?? "#fff")
      : BRAND_COLORS.textOnPrimary,
    mutedColor: isDark
      ? (theme?.palette?.text?.secondary ?? "rgba(255,255,255,0.7)")
      : "rgba(255,255,255,0.88)",
    navInactive: isDark
      ? (theme?.palette?.text?.secondary ?? "rgba(255,255,255,0.7)")
      : "rgba(255,255,255,0.9)",
    navIconInactive: isDark
      ? (theme?.palette?.text?.secondary ?? "rgba(255,255,255,0.7)")
      : "rgba(255,255,255,0.88)",
    navHoverBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    utilityRowBg: isDark ? "rgba(0,0,0,0.42)" : "rgba(0,0,0,0.18)",
    utilityThemeHoverBg: isDark
      ? "rgba(255,255,255,0.1)"
      : "rgba(0,0,0,0.24)",
    utilityLogoutHoverBg: isDark
      ? "rgba(248,113,113,0.28)"
      : "rgba(254,202,202,0.55)",
    dividerColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    /** Utilities on teal chrome (search chips, icons) */
    utilityIcon: isDark
      ? "rgba(255,255,255,0.85)"
      : "rgba(255,255,255,0.92)",
    utilitySubtle: isDark
      ? "rgba(255,255,255,0.7)"
      : "rgba(255,255,255,0.85)",
    utilityChipBg: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.18)",
    utilityChipBgHover: isDark
      ? "rgba(255,255,255,0.16)"
      : "rgba(0,0,0,0.28)",
    searchFieldBg: isDark
      ? "rgba(255,255,255,0.06)"
      : "rgba(0,0,0,0.14)",
    tabInactive: isDark
      ? "rgba(255,255,255,0.65)"
      : "rgba(255,255,255,0.78)",
    tabActive: isDark ? "#fff" : BRAND_COLORS.textOnPrimary,
  };
}
