import { createTheme } from "@mui/material/styles";
import { deriveMainPaletteColor } from "./colorDerivation";

/**
 * Layout surfaces: prefer `sx={{ borderRadius: 2 }}` (2 × theme.shape.borderRadius).
 * Card/Paper defaults use the same multiplier. Box/Stack have no global override — set radius in sx when they act as visible surfaces.
 */
const defaultPrimaryColor = "#422442";
const defaultSecondaryColor = "#ffb56a";

/** Shared popover/menu/autocomplete dropdown surface (see AppointmentsPage autocomplete). */
function dropdownPaperStyles(theme, { borderRadius } = {}) {
  return {
    backgroundImage: "none",
    backgroundColor:
      theme.palette.mode === "light"
        ? "rgba(250,242,252,0.98)"
        : "rgba(22,27,34,0.96)",
    border:
      theme.palette.mode === "light"
        ? "1px solid rgba(102,68,117,0.24)"
        : "1px solid rgba(255,255,255,0.12)",
    boxShadow:
      theme.palette.mode === "light"
        ? "0 12px 26px rgba(33,18,40,0.22)"
        : "0 12px 26px rgba(0,0,0,0.42)",
    ...(borderRadius !== undefined ? { borderRadius } : {}),
  };
}

function lightPalette(settings) {
  return {
    mode: "light",
    primary: {
      main: settings.primary_color || defaultPrimaryColor,
      light: "#6B4D6B",
      dark: "#2d182d",
      contrastText: "#ffffff",
    },
    secondary: {
      main: settings.secondary_color || defaultSecondaryColor,
      light: "#ffd4a8",
      dark: "#e89450",
      contrastText: "#1A1A2E",
    },
    background: {
      default: "#784e78",
      paper: "rgba(255,255,255,0.16)",
    },
    success: {
      main: "#166534",
      light: "#DCFCE7",
      dark: "#14532D",
      contrastText: "#ffffff",
    },
    warning: {
      main: "#C2410C",
      light: "#FFEDD5",
      dark: "#9A3412",
      contrastText: "#ffffff",
    },
    error: {
      main: "#B91C1C",
      light: "#FEE2E2",
      dark: "#991B1B",
      contrastText: "#ffffff",
    },
    info: {
      main: "#1E40AF",
      light: "#DBEAFE",
      dark: "#1E3A8A",
      contrastText: "#ffffff",
    },
    text: {
      primary: "#2E1C34",
      secondary: "rgba(46,28,52,0.72)",
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
    success: {
      main: "#16A34A",
      light: "#14532D",
      dark: "#15803D",
      contrastText: "#ffffff",
    },
    warning: {
      main: "#D97706",
      light: "#78350F",
      dark: "#B45309",
      contrastText: "#ffffff",
    },
    error: {
      main: "#C53030",
      light: "#7F1D1D",
      dark: "#991B1B",
      contrastText: "#ffffff",
    },
    info: {
      main: "#2B5EA8",
      light: "#1E3A5F",
      dark: "#1E40AF",
      contrastText: "#ffffff",
    },
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
          whiteSpace: "nowrap",
          flexShrink: 0,
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.34)",
          color: "inherit",
          transition:
            "transform 180ms ease, box-shadow 220ms ease, background-color 220ms ease",
          "&:hover": {
            transform: "translateY(-1px)",
          },
        },
        contained: {
          background:
            "linear-gradient(145deg, rgba(125,88,131,0.72), rgba(66,36,66,0.85))",
          color: "#FBF5FF",
          "&:hover": { filter: "brightness(1.08)" },
        },
        outlined: {
          color: "#4C2E58",
          borderColor: "rgba(88,56,102,0.48)",
          backgroundColor: "rgba(255,255,255,0.22)",
          "&:hover": {
            borderColor: "rgba(88,56,102,0.62)",
            backgroundColor: "rgba(255,255,255,0.32)",
          },
        },
        text: {
          backgroundColor: "rgba(255,255,255,0.18)",
          color: "#4C2E58",
          "&:hover": { backgroundColor: "rgba(255,255,255,0.3)" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius * 2,
          position: "relative",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.24)",
          background:
            "linear-gradient(155deg, rgba(255,236,244,0.38), rgba(236,203,229,0.35) 52%, rgba(196,156,214,0.31) 100%)",
          boxShadow: "0 10px 24px rgba(24,10,28,0.22)",
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius * 2,
          position: "relative",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.22)",
          background:
            "linear-gradient(160deg, rgba(250,232,242,0.35), rgba(228,194,221,0.33) 50%, rgba(188,147,208,0.29) 100%)",
          boxShadow: "0 10px 24px rgba(24,10,28,0.2)",
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          border: "none",
          background:
            "linear-gradient(160deg, rgba(255,247,252,0.94), rgba(247,232,252,0.9) 52%, rgba(229,206,241,0.86) 100%)",
          borderColor: "rgba(120,78,120,0.22)",
          borderWidth: 1,
          borderStyle: "solid",
          boxShadow: "0 14px 30px rgba(22,10,27,0.24)",
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          flexWrap: "nowrap",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          border: "none",
          backgroundImage: "none",
          backgroundColor:
            theme.palette.mode === "light" ? "#F2E8F4" : "#161b22",
          boxShadow:
            theme.palette.mode === "light"
              ? "2px 0 8px rgba(0,0,0,0.04)"
              : "2px 0 12px rgba(0,0,0,0.4)",
        }),
      },
    },
    MuiTableContainer: {
      styleOverrides: {
        root: {
          maxWidth: "100%",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid rgba(255,255,255,0.18)",
          paddingTop: 12,
          paddingBottom: 12,
          whiteSpace: "nowrap",
        },
        head: {
          backgroundColor: "rgba(255,255,255,0.12)",
          color: "rgba(251,245,255,0.9)",
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
            backgroundColor: "rgba(255,255,255,0.08)",
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          whiteSpace: "nowrap",
          minWidth: "auto",
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          whiteSpace: "nowrap",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          backgroundColor: "rgba(255,255,255,0.34)",
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(88,56,102,0.36)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(88,56,102,0.52)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: primary,
            borderWidth: 2,
          },
          "& .MuiInputBase-input::placeholder": {
            color: "rgba(61,38,71,0.68)",
            opacity: 1,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: "rgba(74,46,85,0.88)",
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
          backgroundColor: "rgba(44,22,50,0.62)",
          color: "#F7EFFA",
          border: "1px solid rgba(255,255,255,0.2)",
          boxShadow: "0 4px 14px rgba(20,8,24,0.2)",
        },
      },
    },
    MuiBackdrop: {
      styleOverrides: {
        root: ({ theme }) =>
          theme.palette.mode === "light"
            ? {
                backgroundColor: "rgba(45,27,53,0.48)",
              }
            : {},
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: ({ theme }) => dropdownPaperStyles(theme),
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundImage: "none",
          backgroundColor:
            theme.palette.mode === "light"
              ? "rgba(250,242,252,0.98)"
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
          whiteSpace: "nowrap",
          flexShrink: 0,
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
          borderRadius: theme.shape.borderRadius * 2,
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
        }),
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          flexWrap: "nowrap",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
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
    MuiTableContainer: {
      styleOverrides: {
        root: {
          maxWidth: "100%",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          paddingTop: 12,
          paddingBottom: 12,
          whiteSpace: "nowrap",
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
    MuiTab: {
      styleOverrides: {
        root: {
          whiteSpace: "nowrap",
          minWidth: "auto",
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          whiteSpace: "nowrap",
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

  return createTheme({
    palette,
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 600 },
    },
    // sx `borderRadius: 2` → 2× this value (24px when set to 12). Card/Paper use the same ×2 rule.
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
      MuiAutocomplete: {
        styleOverrides: {
          paper: ({ theme }) =>
            dropdownPaperStyles(theme, {
              borderRadius: theme.shape.borderRadius,
            }),
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
                  backgroundColor: "#6A4872",
                  backgroundImage:
                    "radial-gradient(circle at 12% 18%, rgba(231,197,239,0.34), transparent 36%), radial-gradient(circle at 88% 8%, rgba(255,224,239,0.23), transparent 32%), radial-gradient(circle at 76% 84%, rgba(191,156,218,0.3), transparent 40%), linear-gradient(135deg, #6A4872 0%, #795484 52%, #8D67A1 100%)",
                  backgroundAttachment: "scroll",
                  backgroundSize: "170% 170%",
                  animation:
                    "lightGradientFlow 40s ease-in-out infinite alternate",
                  color: "#F7EFFA",
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
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23ffd7ab' stroke-width='2.2' stroke-linecap='round'%3E%3Cpath d='M60 36v18M60 66v18M42 60h18M66 60h18'/%3E%3C/g%3E%3C/svg%3E\"), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cpath d='M60 83c-15-9-24-17-24-29 0-8 6-14 14-14 5 0 9 2 10 6 1-4 5-6 10-6 8 0 14 6 14 14 0 12-9 20-24 29Z' fill='none' stroke='%23ffc8e4' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
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
                    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23efc8ff' stroke-width='2.1' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M30 66h14l8-16 10 28 8-16h20'/%3E%3Ccircle cx='60' cy='60' r='26'/%3E%3C/g%3E%3C/svg%3E\"), url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23ffe1ba' stroke-width='2.1' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M50 76V46M70 76V46'/%3E%3Cpath d='M40 46h40v30H40z'/%3E%3Cpath d='M80 56h8'/%3E%3C/g%3E%3C/svg%3E\")",
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
