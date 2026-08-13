import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  SwipeableDrawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Divider,
  Button,
} from "@mui/material";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import useAuthStore from "../../stores/authStore";
import useThemeModeStore from "../../stores/themeModeStore";
import { isSidebarNavItemActive } from "../../utils/sidebarNavActive";
import { NAV_ICONS } from "./navIcons";
import LogoutConfirmDialog from "./LogoutConfirmDialog";

export default function MobileMoreSheet({ open, onClose, sections }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const themeMode = useThemeModeStore((s) => s.themeMode);
  const setThemeMode = useThemeModeStore((s) => s.setThemeMode);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const confirmLogout = () => {
    logout();
    setLogoutConfirmOpen(false);
    onClose();
    navigate("/login");
  };

  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      onOpen={() => {}}
      disableSwipeToOpen
      PaperProps={{
        sx: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          maxHeight: "70vh",
          pb: "env(safe-area-inset-bottom, 0px)",
        },
      }}
    >
      <Box sx={{ py: 1.5, px: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          More
        </Typography>
      </Box>
      <Divider />
      <List dense sx={{ overflowY: "auto" }}>
        {sections.map((section) => (
          <Box key={section.id}>
            <Typography
              variant="caption"
              sx={{
                px: 2,
                pt: 1.5,
                pb: 0.5,
                display: "block",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "text.secondary",
              }}
            >
              {section.label}
            </Typography>
            {(section.children ?? []).map((child) => {
              const Icon = NAV_ICONS[child.icon];
              const active = isSidebarNavItemActive(pathname, child.path);
              return (
                <ListItemButton
                  key={child.path}
                  component={Link}
                  to={child.path}
                  selected={active}
                  onClick={onClose}
                  sx={{ py: 1 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {Icon ? <Icon fontSize="small" /> : null}
                  </ListItemIcon>
                  <ListItemText primary={child.label} />
                </ListItemButton>
              );
            })}
          </Box>
        ))}
      </List>
      <Divider />
      <Box sx={{ px: 2, py: 1.5, display: "flex", gap: 1 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={
            themeMode === "dark" ? (
              <LightModeOutlinedIcon />
            ) : (
              <DarkModeOutlinedIcon />
            )
          }
          onClick={() =>
            setThemeMode(themeMode === "dark" ? "light" : "dark")
          }
        >
          {themeMode === "dark" ? "Light" : "Dark"}
        </Button>
        <Button
          fullWidth
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
          onClick={() => setLogoutConfirmOpen(true)}
        >
          Log out
        </Button>
      </Box>

      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={confirmLogout}
      />
    </SwipeableDrawer>
  );
}
