import { createTheme } from "@mui/material/styles";
import { BRAND_COLORS, brandRgba } from "./brandColors";
import { deriveMainPaletteColor } from "./colorDerivation";

/**
 * Layout surfaces: prefer `sx={{ borderRadius: 2 }}` (2 × theme.shape.borderRadius).
 * Card/Paper defaults use the same multiplier. Box/Stack have no global override — set radius in sx when they act as visible surfaces.
 */
const {
  primary: defaultPrimaryColor,
  secondary: defaultSecondaryColor,
  background: defaultBackgroundColor,
  primaryLight,
  primaryDark,
  secondaryLight,
  secondaryDark,
  textOnBackground,
  textOnBackgroundMuted,
  textOnPrimary,
} = BRAND_COLORS;

/** Opaque dropdown surfaces (Autocomplete list, etc.) */
const DROPDOWN_SURFACE = {
  light: "#f0f2f5",
  dark: "#2d333b",
};

function lightPalette(settings) {
  const bg = settings.background_color || defaultBackgroundColor;
  return {
    mode: "light",
    primary: {
      main: settings.primary_color || defaultPrimaryColor,
      light: primaryLight,
      dark: primaryDark,
      contrastText: textOnPrimary,
    },
    secondary: {
      main: settings.secondary_color || defaultSecondaryColor,
      light: secondaryLight,
      dark: secondaryDark,
      contrastText: textOnBackground,
    },
    background: {
      default: bg,
      paper: "rgba(255,255,255,0.48)",
    },
    success: { main: "#10B981" },
    warning: { main: "#F59E0B" },
    error: { main: "#EF4444" },
    info: { main: "#3B82F6" },
    text: {
      primary: textOnBackground,
      secondary: textOnBackgroundMuted,
    },
  };
}

function darkPalette(settings) {
  const primary = deriveMainPaletteColor(
    settings.primary_color || defaultPrimaryColor,
  );
  const secondary = deriveMainPaletteColor(
    settings.secondary_color || defaultSecondaryColor,
  );

  return {
    mode: "dark",
    primary: {
      main: primary.main,
      contrastText: primary.contrastText,
      light: primary.main,
      dark: primary.main,
    },
    secondary: {
      main: secondary.main,
      contrastText: secondary.contrastText,
      light: secondary.main,
      dark: secondary.main,
    },
    background: {
      default: "#0d1117",
      paper: "#161b22",
    },
    divider: "rgba(255,255,255,0.08)",
    success: { main: "#34D399" },
    warning: { main: "#FBBF24" },
    error: { main: "#F87171" },
    info: { main: "#60A5FA" },
    text: {
      primary: "#f0f6fc",
      secondary: "#8b949e",
    },
  };
}

function lightComponentOverrides(settings) {
  const primary = settings.primary_color || defaultPrimaryColor;
  return {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.5)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.55), 0 12px 30px rgba(30, 61, 62, 0.12)",
          backgroundColor: "rgba(255,255,255,0.22)",
          color: "inherit",
          transition:
            "transform 180ms ease, box-shadow 220ms ease, background-color 220ms ease",
          "&:hover": {
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.65), 0 18px 34px rgba(30, 61, 62, 0.16)",
            backgroundColor: "rgba(255,255,255,0.32)",
            transform: "translateY(-1px)",
          },
        },
        contained: {
          background: `linear-gradient(145deg, ${brandRgba("primary", 0.88)}, ${brandRgba("primary", 0.98)})`,
          color: textOnPrimary,
          "&:hover": { filter: "brightness(1.08)" },
        },
        outlined: {
          color: textOnBackground,
          borderColor: brandRgba("primary", 0.42),
          backgroundColor: "rgba(255,255,255,0.28)",
          "&:hover": {
            borderColor: brandRgba("primary", 0.58),
            backgroundColor: "rgba(255,255,255,0.4)",
          },
        },
        text: {
          backgroundColor: "rgba(255,255,255,0.24)",
          color: textOnBackground,
          "&:hover": { backgroundColor: "rgba(255,255,255,0.36)" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 1,
          position: "relative",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.38)",
          background: `linear-gradient(155deg, rgba(255,255,255,0.58), ${brandRgba("secondary", 0.42)} 52%, ${brandRgba("primary", 0.1)} 100%)`,
          boxShadow: "0 10px 24px rgba(30, 61, 62, 0.1)",
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius * 2,
          position: "relative",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.34)",
          background: `linear-gradient(160deg, rgba(255,255,255,0.52), ${brandRgba("secondary", 0.38)} 50%, ${brandRgba("primary", 0.08)} 100%)`,
          boxShadow: "0 10px 24px rgba(30, 61, 62, 0.08)",
          "&.MuiDialog-paper": {
            background: "#ffffff",
            backgroundImage: "none",
            border: `1px solid ${brandRgba("primary", 0.22)}`,
            boxShadow: "0 14px 30px rgba(30, 61, 62, 0.18)",
          },
          "&.MuiAutocomplete-paper": {
            background: DROPDOWN_SURFACE.light,
            backgroundImage: "none",
            border: `1px solid ${brandRgba("primary", 0.16)}`,
            boxShadow: "0 8px 20px rgba(30, 61, 62, 0.12)",
          },
        }),
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          background: DROPDOWN_SURFACE.light,
          backgroundImage: "none",
          border: `1px solid ${brandRgba("primary", 0.16)}`,
          boxShadow: "0 8px 20px rgba(30, 61, 62, 0.12)",
        },
        listbox: {
          backgroundColor: DROPDOWN_SURFACE.light,
          padding: 4,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: "#ffffff",
          backgroundImage: "none",
          border: `1px solid ${brandRgba("primary", 0.22)}`,
          boxShadow: "0 14px 30px rgba(30, 61, 62, 0.18)",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          border: "none",
          backgroundImage: "none",
          backgroundColor:
            theme.palette.mode === "light"
              ? "rgba(255,255,255,0.72)"
              : "#161b22",
          boxShadow:
            theme.palette.mode === "light"
              ? "2px 0 8px rgba(30,61,62,0.06)"
              : "2px 0 12px rgba(0,0,0,0.4)",
        }),
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid rgba(255,255,255,0.28)",
          paddingTop: 12,
          paddingBottom: 12,
        },
        head: {
          backgroundColor: brandRgba("primary", 0.12),
          color: brandRgba("text", 0.92),
          fontWeight: 600,
          fontSize: 13,
          borderBottom: "none",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&.MuiTableRow-hover:hover": {
            backgroundColor: "rgba(255,255,255,0.14)",
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: "rgba(255,255,255,0.42)",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: brandRgba("primary", 0.32),
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: brandRgba("primary", 0.48),
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: primary,
            borderWidth: 2,
          },
          "& .MuiInputBase-input::placeholder": {
            color: brandRgba("text", 0.55),
            opacity: 1,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: brandRgba("text", 0.82),
          "&.Mui-focused": {
            color: primary,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 500, fontSize: 12 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: brandRgba("primary", 0.88),
          color: textOnPrimary,
          border: "1px solid rgba(255,255,255,0.28)",
          boxShadow: "0 4px 14px rgba(30, 61, 62, 0.12)",
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: ({ theme }) =>
          theme.palette.mode === "light"
            ? {
                backgroundColor: brandRgba("text", 0.38),
              }
            : {},
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundImage: "none",
          backgroundColor:
            theme.palette.mode === "light"
              ? "rgba(255,255,255,0.97)"
              : "rgba(22,27,34,0.96)",
          border:
            theme.palette.mode === "light"
              ? `1px solid ${brandRgba("primary", 0.22)}`
              : "1px solid rgba(255,255,255,0.12)",
          boxShadow:
            theme.palette.mode === "light"
              ? "0 12px 26px rgba(30, 61, 62, 0.12)"
              : "0 12px 26px rgba(0,0,0,0.42)",
        }),
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundImage: "none",
          backgroundColor:
            theme.palette.mode === "light"
              ? "rgba(255,255,255,0.97)"
              : "rgba(22,27,34,0.96)",
        }),
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: ({ theme }) => ({
          [theme.breakpoints.down("sm")]: {
            paddingLeft: theme.spacing(1),
            paddingRight: theme.spacing(1),
          },
        }),
      },
    },
  };
}

function darkComponentOverrides(settings) {
  const primary = deriveMainPaletteColor(
    settings.primary_color || defaultPrimaryColor,
  ).main;
  return {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 999,
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
        },
        contained: {
          boxShadow: "none",
          "&:hover": { boxShadow: "none", filter: "brightness(1.08)" },
        },

        text: {
          backgroundColor: "rgba(255,255,255,0.06)",
          color: "#f0f6fc",
          "&:hover": { backgroundColor: "rgba(255,255,255,0.1)" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 1,
          boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
          backgroundImage: "none",
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius * 2,
          boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
          backgroundImage: "none",
          "&.MuiAutocomplete-paper": {
            background: DROPDOWN_SURFACE.dark,
            backgroundImage: "none",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
          },
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          background: "#161b22",
          backgroundImage: "none",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 14px 40px rgba(0,0,0,0.5)",
        },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: {
          background: DROPDOWN_SURFACE.dark,
          backgroundImage: "none",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
        },
        listbox: {
          backgroundColor: DROPDOWN_SURFACE.dark,
          padding: 4,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: "none",
          boxShadow: "2px 0 12px rgba(0,0,0,0.4)",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          paddingTop: 12,
          paddingBottom: 12,
        },
        head: {
          backgroundColor: "rgba(255,255,255,0.04)",
          color: "#8b949e",
          fontWeight: 600,
          fontSize: 13,
          borderBottom: "none",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&.MuiTableRow-hover:hover": {
            backgroundColor: "rgba(255,255,255,0.04)",
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: "rgba(255,255,255,0.05)",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255,255,255,0.12)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255,255,255,0.2)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: primary,
            borderWidth: 2,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: "#8b949e",
          "&.Mui-focused": {
            color: primary,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 500, fontSize: 12 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#161b22",
          color: "#f0f6fc",
          boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
          backgroundImage: "none",
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: ({ theme }) => ({
          [theme.breakpoints.down("sm")]: {
            paddingLeft: theme.spacing(1),
            paddingRight: theme.spacing(1),
          },
        }),
      },
    },
  };
}

const createAppTheme = (settings = {}) => {
  const mode = settings.theme_mode === "dark" ? "dark" : "light";
  const palette =
    mode === "dark" ? darkPalette(settings) : lightPalette(settings);
  const components =
    mode === "dark"
      ? darkComponentOverrides(settings)
      : lightComponentOverrides(settings);
  const bg = settings.background_color || defaultBackgroundColor;

  return createTheme({
    palette,
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    components: {
      ...components,
      MuiTextField: {
        styleOverrides: {
          root: ({ ownerState, theme }) =>
            ownerState?.select && !ownerState?.fullWidth
              ? {
                  [theme.breakpoints.up("md")]: {
                    minWidth: 220,
                  },
                }
              : {},
        },
      },
      MuiCssBaseline: {
        styleOverrides: (theme) => ({
          ":root": {
            colorScheme: theme.palette.mode,
          },
          html:
            theme.palette.mode === "light"
              ? {
                  height: "100%",
                  overflow: "hidden",
                }
              : {},
          body:
            theme.palette.mode === "light"
              ? {
                  position: "relative",
                  height: "100%",
                  minHeight: "100dvh",
                  backgroundColor: "#f4f5f2",
                  backgroundImage: `radial-gradient(circle at 12% 18%, ${brandRgba("secondary", 0.28)}, transparent 36%), radial-gradient(circle at 88% 8%, ${brandRgba("primary", 0.1)}, transparent 32%), radial-gradient(circle at 76% 84%, ${brandRgba("primary", 0.08)}, transparent 40%), linear-gradient(135deg, #f8f9f7 0%, ${bg} 52%, ${secondaryLight} 100%)`,
                  backgroundAttachment: "scroll",
                  backgroundSize: "170% 170%",
                  animation:
                    "lightGradientFlow 40s ease-in-out infinite alternate",
                  color: textOnBackground,
                  overflow: "hidden",
                }
              : {},
          "body::before":
            theme.palette.mode === "light"
              ? {
                  content: '""',
                  position: "fixed",
                  inset: 0,
                  pointerEvents: "none",
                  zIndex: 1,
                  opacity: 0.04,
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23e8e9eb' stroke-width='2.2' stroke-linecap='round'%3E%3Cpath d='M60 36v18M60 66v18M42 60h18M66 60h18'/%3E%3C/g%3E%3C/svg%3E\"), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M60 83c-15-9-24-17-24-29 0-8 6-14 14-14 5 0 9 2 10 6 1-4 5-6 10-6 8 0 14 6 14 14 0 12-9 20-24 29Z' fill='none' stroke='%234db8bc' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
                  backgroundRepeat: "no-repeat, no-repeat",
                  backgroundSize: "108px 108px, 120px 120px",
                  backgroundPosition: "14% 22%, 82% 30%",
                  animation: "iconFloatA 60s ease-in-out infinite",
                }
              : {},
          "body::after":
            theme.palette.mode === "light"
              ? {
                  content: '""',
                  position: "fixed",
                  inset: 0,
                  pointerEvents: "none",
                  zIndex: 1,
                  opacity: 0.03,
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23209da1' stroke-width='2.1' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M30 66h14l8-16 10 28 8-16h20'/%3E%3Ccircle cx='60' cy='60' r='26'/%3E%3C/g%3E%3C/svg%3E\"), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23cbced2' stroke-width='2.1' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M50 76V46M70 76V46'/%3E%3Cpath d='M40 46h40v30H40z'/%3E%3Cpath d='M80 56h8'/%3E%3C/g%3E%3C/svg%3E\")",
                  backgroundRepeat: "no-repeat, no-repeat",
                  backgroundSize: "122px 122px, 108px 108px",
                  backgroundPosition: "24% 80%, 74% 72%",
                  animation: "iconFloatB 76s ease-in-out infinite",
                }
              : {},
          "#root": {
            position: "relative",
            zIndex: 2,
            height: theme.palette.mode === "light" ? "100%" : undefined,
            overflow: theme.palette.mode === "light" ? "hidden" : undefined,
          },
          "#workspace-layout-root":
            theme.palette.mode === "light"
              ? {
                  isolation: "isolate",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    zIndex: 0,
                    opacity: 0.04,
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23e8e9eb' stroke-width='2.2' stroke-linecap='round'%3E%3Cpath d='M60 36v18M60 66v18M42 60h18M66 60h18'/%3E%3C/g%3E%3C/svg%3E\"), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M60 83c-15-9-24-17-24-29 0-8 6-14 14-14 5 0 9 2 10 6 1-4 5-6 10-6 8 0 14 6 14 14 0 12-9 20-24 29Z' fill='none' stroke='%234db8bc' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
                    backgroundRepeat: "no-repeat, no-repeat",
                    backgroundSize: "108px 108px, 120px 120px",
                    backgroundPosition: "14% 22%, 82% 30%",
                    animation: "iconFloatA 60s ease-in-out infinite",
                  },
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    zIndex: 0,
                    opacity: 0.03,
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23209da1' stroke-width='2.1' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M30 66h14l8-16 10 28 8-16h20'/%3E%3Ccircle cx='60' cy='60' r='26'/%3E%3C/g%3E%3C/svg%3E\"), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23cbced2' stroke-width='2.1' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M50 76V46M70 76V46'/%3E%3Cpath d='M40 46h40v30H40z'/%3E%3Cpath d='M80 56h8'/%3E%3C/g%3E%3C/svg%3E\")",
                    backgroundRepeat: "no-repeat, no-repeat",
                    backgroundSize: "122px 122px, 108px 108px",
                    backgroundPosition: "24% 80%, 74% 72%",
                    animation: "iconFloatB 76s ease-in-out infinite",
                  },
                  "& > *": {
                    position: "relative",
                    zIndex: 1,
                  },
                }
              : {},
          'input[type="number"]': {
            MozAppearance: "textfield",
          },
          'input[type="number"]::-webkit-outer-spin-button, input[type="number"]::-webkit-inner-spin-button':
            {
              WebkitAppearance: "none",
              margin: 0,
            },
          "@keyframes lightGradientFlow": {
            "0%": { backgroundPosition: "0% 28%" },
            "50%": { backgroundPosition: "100% 72%" },
            "100%": { backgroundPosition: "12% 36%" },
          },
          "@keyframes iconFloatA": {
            "0%": { opacity: 0.03, transform: "translate3d(0, 0, 0)" },
            "25%": { opacity: 0.06, transform: "translate3d(8px, -10px, 0)" },
            "50%": { opacity: 0.04, transform: "translate3d(16px, -4px, 0)" },
            "75%": { opacity: 0.05, transform: "translate3d(6px, 8px, 0)" },
            "100%": { opacity: 0.03, transform: "translate3d(0, 0, 0)" },
          },
          "@keyframes iconFloatB": {
            "0%": { opacity: 0.02, transform: "translate3d(0, 0, 0)" },
            "30%": { opacity: 0.05, transform: "translate3d(-10px, -6px, 0)" },
            "60%": { opacity: 0.035, transform: "translate3d(-18px, 8px, 0)" },
            "100%": { opacity: 0.02, transform: "translate3d(0, 0, 0)" },
          },
        }),
      },
    },
  });
};

export default createAppTheme;
