import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  Typography,
  Tab,
  Tabs,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useTheme } from "@mui/material/styles";
import useSettingsStore from "../../stores/settingsStore";
import { getClinicDisplayName } from "../../utils/clinicBranding";
import { BRAND_COLORS } from "../../theme/brandColors";
import { deriveSurfaceAccentPair } from "../../theme/colorDerivation";
import TopbarUtilities from "./TopbarUtilities";
import PatientSearchField from "./PatientSearchField";
import { getWorkspaceChromeColors } from "./workspaceChromeColors";

export default function AppTopNav({
  sections,
  activeSection,
  onSectionChange,
  onMenuClick,
  showSectionTabs = true,
}) {
  const theme = useTheme();
  const { settings } = useSettingsStore();
  const clinicTitle = getClinicDisplayName(settings);
  const isDark = theme.palette.mode === "dark";
  const rawAccent = settings?.secondary_color || BRAND_COLORS.secondary;
  const accentPair = isDark
    ? deriveSurfaceAccentPair(rawAccent)
    : { bg: rawAccent, fg: "#1A1A2E" };
  const chrome = getWorkspaceChromeColors(isDark, theme);

  const activeIndex = Math.max(
    0,
    sections.findIndex((s) => s.id === activeSection?.id),
  );

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        flexShrink: 0,
        borderRadius: 0,
        background: chrome.chromeBg,
        color: chrome.titleColor,
        borderBottom: `1px solid ${chrome.borderColor}`,
      }}
    >
      <Toolbar
        sx={{
          gap: 1,
          px: { xs: 1, sm: 2 },
          minHeight: { xs: 52, sm: 56 },
          alignItems: "center",
          flexWrap: "nowrap",
        }}
      >
        <IconButton
          edge="start"
          onClick={onMenuClick}
          sx={{
            display: { sm: "none" },
            mr: 0.25,
            color: chrome.utilityIcon,
          }}
          aria-label="Open menu"
        >
          <MenuIcon />
        </IconButton>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexShrink: 0,
          }}
        >
          <Box
            component="img"
            src={settings?.logo_url || "/images/logo.png"}
            alt={clinicTitle}
            sx={{
              height: 32,
              width: "auto",
              maxWidth: 88,
              objectFit: "contain",
              display: "block",
            }}
          />
          <Typography
            noWrap
            sx={{
              fontWeight: 700,
              fontSize: { xs: 13, sm: 14 },
              color: chrome.titleColor,
              display: { xs: "none", md: "block" },
            }}
          >
            {clinicTitle}
          </Typography>
        </Box>

        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            mx: { xs: 0.5, sm: 1 },
            justifyContent: { xs: "stretch", md: "flex-end" },
          }}
        >
          <PatientSearchField />
        </Box>

        <TopbarUtilities variant="workspaceChrome" />
      </Toolbar>

      {showSectionTabs && sections.length > 0 ? (
        <Tabs
          value={activeIndex}
          onChange={(_, idx) => onSectionChange(sections[idx])}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: { xs: 40, sm: 44 },
            borderTop: `1px solid ${chrome.borderColor}`,
            px: { xs: 0.5, sm: 1 },
            "& .MuiTab-root": {
              minHeight: { xs: 40, sm: 44 },
              textTransform: "none",
              fontWeight: 600,
              fontSize: { xs: 12, sm: 13 },
              py: 0,
              color: chrome.tabInactive,
            },
            "& .MuiTab-root.Mui-selected": {
              color: chrome.tabActive,
            },
            "& .MuiTabs-indicator": {
              backgroundColor: accentPair.bg,
            },
          }}
        >
          {sections.map((section) => (
            <Tab key={section.id} label={section.label} />
          ))}
        </Tabs>
      ) : null}
    </AppBar>
  );
}
