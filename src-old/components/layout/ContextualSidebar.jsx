import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme,
} from "@mui/material";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import useAuthStore from "../../stores/authStore";
import useThemeModeStore from "../../stores/themeModeStore";
import useSettingsStore from "../../stores/settingsStore";
import { deriveSurfaceAccentPair } from "../../theme/colorDerivation";
import { isSidebarNavItemActive } from "../../utils/sidebarNavActive";
import { NAV_ICONS } from "./navIcons";
import {
  sidebarListIconSx,
  sidebarNavButtonSx,
  sidebarNavChildButtonSx,
  sidebarNavChildProps,
  sidebarRootSx,
  sidebarUtilityTextProps,
} from "./sidebarTypography";
import { getWorkspaceChromeColors } from "./workspaceChromeColors";
import LogoutConfirmDialog from "./LogoutConfirmDialog";

export default function ContextualSidebar({ items, drawerWidth = 220 }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout } = useAuthStore();
  const themeMode = useThemeModeStore((s) => s.themeMode);
  const setThemeMode = useThemeModeStore((s) => s.setThemeMode);
  const { settings } = useSettingsStore();
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const isDark = theme.palette.mode === "dark";
  const rawAccent = settings?.secondary_color || "#ffb56a";
  const accentPair = isDark
    ? deriveSurfaceAccentPair(rawAccent)
    : { bg: rawAccent, fg: "#1A1A2E" };
  const accentColor = accentPair.bg;
  const accentFg = accentPair.fg;
  const chrome = getWorkspaceChromeColors(isDark, theme);

  const confirmLogout = () => {
    logout();
    setLogoutConfirmOpen(false);
    navigate("/login");
  };

  return (
    <>
      <Box
        component="nav"
        sx={{
          display: { xs: "none", sm: "flex" },
          flexDirection: "column",
          width: drawerWidth,
          flexShrink: 0,
          height: "100%",
          minHeight: 0,
          background: chrome.chromeBg,
          borderRight: chrome.borderColor,
          borderRightWidth: 1,
          borderRightStyle: "solid",
          ...sidebarRootSx,
        }}
      >
        <List
          sx={{
            px: 1.5,
            pt: 1.5,
            flexGrow: 1,
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          {items.map((child) => {
            const ChildIcon = NAV_ICONS[child.icon];
            const childActive = isSidebarNavItemActive(pathname, child.path);
            return (
              <ListItem disablePadding key={child.path} sx={{ mb: 0.25 }}>
                <ListItemButton
                  component={Link}
                  to={child.path}
                  aria-current={childActive ? "page" : undefined}
                  className={childActive ? "sidebar-nav-active" : undefined}
                  sx={{
                    borderRadius: "12px",
                    ...sidebarNavChildButtonSx,
                    "&.sidebar-nav-active": {
                      bgcolor: accentColor,
                      color: accentFg,
                      "& .MuiListItemIcon-root": { color: accentFg },
                      "&:hover": {
                        bgcolor: accentColor,
                        filter: isDark ? "brightness(1.06)" : "brightness(0.97)",
                      },
                    },
                    "&:not(.sidebar-nav-active)": {
                      color: chrome.navInactive,
                      "& .MuiListItemIcon-root": {
                        color: chrome.navIconInactive,
                      },
                    },
                    "&:not(.sidebar-nav-active):hover": {
                      bgcolor: chrome.navHoverBg,
                    },
                  }}
                >
                  <ListItemIcon sx={sidebarListIconSx}>
                    {ChildIcon && <ChildIcon fontSize="small" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={child.label}
                    primaryTypographyProps={{
                      ...sidebarNavChildProps,
                      color: "inherit",
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        <Box sx={{ px: 1.5, pb: 2, pt: 0.5, flexShrink: 0 }}>
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() =>
                setThemeMode(themeMode === "dark" ? "light" : "dark")
              }
              sx={{
                borderRadius: "12px",
                ...sidebarNavButtonSx,
                bgcolor: chrome.utilityRowBg,
                color: chrome.navInactive,
                "& .MuiListItemIcon-root": { color: chrome.navIconInactive },
                "&:hover": { bgcolor: chrome.utilityThemeHoverBg },
              }}
            >
              <ListItemIcon sx={sidebarListIconSx}>
                {themeMode === "dark" ? (
                  <LightModeOutlinedIcon fontSize="small" />
                ) : (
                  <DarkModeOutlinedIcon fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={themeMode === "dark" ? "Light mode" : "Dark mode"}
                primaryTypographyProps={{
                  ...sidebarUtilityTextProps,
                  color: "inherit",
                }}
              />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => setLogoutConfirmOpen(true)}
              sx={{
                borderRadius: "12px",
                ...sidebarNavButtonSx,
                bgcolor: chrome.utilityRowBg,
                color: chrome.navInactive,
                "& .MuiListItemIcon-root": { color: chrome.navIconInactive },
                "&:hover": { bgcolor: chrome.utilityLogoutHoverBg },
              }}
            >
              <ListItemIcon sx={sidebarListIconSx}>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Log out"
                primaryTypographyProps={{
                  ...sidebarUtilityTextProps,
                  color: "inherit",
                }}
              />
            </ListItemButton>
          </ListItem>
        </Box>
      </Box>

      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={confirmLogout}
      />
    </>
  );
}
