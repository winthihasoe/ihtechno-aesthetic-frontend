/**
 * Shared chrome colors for AppTopNav + ContextualSidebar (matches legacy Sidebar).
 * @param {boolean} isDark
 * @param {import("@mui/material/styles").Theme} [theme]
 */
export function getWorkspaceChromeColors(isDark, theme) {
  return {
    chromeBg: isDark
      ? "#0d1117"
      : "linear-gradient(170deg, rgb(78,50,88), rgb(92,60,104) 55%, rgb(108,74,122) 100%)",
    titleColor: isDark ? theme?.palette?.text?.primary ?? "#fff" : "#FBF5FF",
    mutedColor: isDark
      ? theme?.palette?.text?.secondary ?? "rgba(255,255,255,0.7)"
      : "rgba(251,245,255,0.82)",
    navInactive: isDark
      ? theme?.palette?.text?.secondary ?? "rgba(255,255,255,0.7)"
      : "rgba(251,245,255,0.9)",
    navIconInactive: isDark
      ? theme?.palette?.text?.secondary ?? "rgba(255,255,255,0.7)"
      : "rgba(251,245,255,0.82)",
    navHoverBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    utilityRowBg: isDark ? "rgba(0,0,0,0.42)" : "rgba(0,0,0,0.22)",
    utilityThemeHoverBg: isDark
      ? "rgba(255,255,255,0.1)"
      : "rgba(0,0,0,0.32)",
    utilityLogoutHoverBg: isDark
      ? "rgba(248,113,113,0.28)"
      : "rgba(254,202,202,0.55)",
    dividerColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    /** Utilities on purple chrome (search chips, icons) */
    utilityIcon: isDark
      ? "rgba(255,255,255,0.85)"
      : "rgba(251,245,255,0.9)",
    utilitySubtle: isDark
      ? "rgba(255,255,255,0.7)"
      : "rgba(251,245,255,0.82)",
    utilityChipBg: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.22)",
    utilityChipBgHover: isDark
      ? "rgba(255,255,255,0.16)"
      : "rgba(0,0,0,0.32)",
    searchFieldBg: isDark
      ? "rgba(255,255,255,0.06)"
      : "rgba(0,0,0,0.18)",
    tabInactive: isDark
      ? "rgba(255,255,255,0.65)"
      : "rgba(251,245,255,0.75)",
    tabActive: isDark ? "#fff" : "#FBF5FF",
  };
}
