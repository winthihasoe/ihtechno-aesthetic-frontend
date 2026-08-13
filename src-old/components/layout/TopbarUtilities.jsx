import { useState } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import {
  IconButton,
  Typography,
  Badge,
  Box,
  Popover,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  Avatar,
  Button,
  useTheme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CloseIcon from "@mui/icons-material/Close";
import LogoutIcon from "@mui/icons-material/Logout";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import useAuthStore from "../../stores/authStore";
import useNotificationStore from "../../stores/notificationStore";
import useSettingsStore from "../../stores/settingsStore";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "../../services/notificationService";
import { deriveSurfaceAccentPair } from "../../theme/colorDerivation";
import { getWorkspaceChromeColors } from "./workspaceChromeColors";
import LogoutConfirmDialog from "./LogoutConfirmDialog";

export default function TopbarUtilities({ variant = "default" }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { settings } = useSettingsStore();
  const {
    notifications,
    markAllRead,
    markRead,
    dismissNotification,
    clearAll,
    unreadCount,
  } = useNotificationStore();
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [accountAnchorEl, setAccountAnchorEl] = useState(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);

  const count = unreadCount();

  const handleMarkAllRead = async () => {
    markAllRead();
    try {
      await markAllNotificationsRead();
    } catch {
      // local state already updated
    }
  };

  const handleMarkRead = async (id) => {
    markRead(id);
    const row = notifications.find((n) => n.id === id);
    if (row?.source === "server") {
      try {
        await markNotificationRead(id);
      } catch {
        // ignore
      }
    }
  };
  const isDark = theme.palette.mode === "dark";
  const onChrome = variant === "workspaceChrome";
  const chrome = onChrome ? getWorkspaceChromeColors(isDark, theme) : null;
  const rawAccent = settings?.secondary_color || theme.palette.secondary.main;
  const avatarAccent = isDark
    ? deriveSurfaceAccentPair(rawAccent)
    : { bg: rawAccent, fg: "#1A1A2E" };
  const chipBg = onChrome
    ? chrome.utilityChipBg
    : isDark
      ? alpha(theme.palette.secondary.main, 0.14)
      : alpha(theme.palette.secondary.main, 0.2);
  const chipBgHover = onChrome
    ? chrome.utilityChipBgHover
    : isDark
      ? alpha(theme.palette.secondary.main, 0.22)
      : alpha(theme.palette.secondary.main, 0.28);
  const iconMuted = onChrome
    ? chrome.utilityIcon
    : isDark
      ? alpha(theme.palette.secondary.light, 0.95)
      : theme.palette.secondary.dark;
  const titleColor = onChrome
    ? chrome.titleColor
    : isDark
      ? theme.palette.text.primary
      : "#1A1A2E";
  const subtleText = onChrome
    ? chrome.utilitySubtle
    : isDark
      ? alpha(theme.palette.secondary.light, 0.78)
      : alpha(theme.palette.secondary.dark, 0.78);
  const listRowHover = isDark ? "rgba(255,255,255,0.04)" : "#F7F8FA";

  const confirmLogout = () => {
    logout();
    setLogoutConfirmOpen(false);
    setAccountAnchorEl(null);
    navigate("/login");
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexShrink: 0,
        }}
      >
        <IconButton
          onClick={(e) => setNotificationAnchorEl(e.currentTarget)}
          aria-label="Notifications"
          sx={{
            flexShrink: 0,
            bgcolor: chipBg,
            borderRadius: "12px",
            width: 38,
            height: 38,
            "&:hover": { bgcolor: chipBgHover },
          }}
        >
          <Badge
            badgeContent={count}
            color="error"
            sx={{ "& .MuiBadge-badge": { fontSize: 10 } }}
          >
            <NotificationsIcon sx={{ fontSize: 20, color: iconMuted }} />
          </Badge>
        </IconButton>

        <Button
          variant="contained"
          onClick={(e) => setAccountAnchorEl(e.currentTarget)}
          aria-label="Open account menu"
          endIcon={
            <KeyboardArrowDownIcon
              sx={{
                display: { xs: "none", sm: "inline-flex" },
                fontSize: 18,
                color: subtleText,
              }}
            />
          }
          sx={{
            p: 0.5,
            pr: { xs: 0.5, sm: 1 },
            textTransform: "none",
            display: { xs: "none", sm: "flex" },
            alignItems: "center",
            gap: 1,
            minWidth: 0,
            flexShrink: 0,
            bgcolor: chipBg,
            "&:hover": { bgcolor: chipBgHover },
          }}
        >
          <Avatar
            sx={{
              width: { xs: 30, sm: 34 },
              height: { xs: 30, sm: 34 },
              bgcolor: avatarAccent.bg,
              color: avatarAccent.fg,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {user?.name?.[0]?.toUpperCase()}
          </Avatar>
          <Box
            sx={{
              display: { xs: "none", sm: "block" },
              minWidth: 0,
              maxWidth: 150,
            }}
          >
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 600,
                lineHeight: 1.2,
                color: titleColor,
              }}
              noWrap
            >
              {user?.name}
            </Typography>
            <Typography
              sx={{
                fontSize: 11,
                color: subtleText,
                textTransform: "capitalize",
              }}
              noWrap
            >
              {user?.role}
            </Typography>
          </Box>
        </Button>

        <Avatar
          sx={{
            width: { xs: 30, sm: 34 },
            height: { xs: 30, sm: 34 },
            bgcolor: avatarAccent.bg,
            color: avatarAccent.fg,
            fontSize: 13,
            fontWeight: 700,
            display: { xs: "flex", sm: "none" },
            cursor: "pointer",
          }}
          onClick={(e) => setAccountAnchorEl(e.currentTarget)}
        >
          {user?.name?.[0]?.toUpperCase()}
        </Avatar>
      </Box>

      <Popover
        open={Boolean(notificationAnchorEl)}
        anchorEl={notificationAnchorEl}
        onClose={() => setNotificationAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            width: { xs: 280, sm: 320 },
            mt: 1,
            borderRadius: 1,
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Notifications
            </Typography>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              <Button
                size="small"
                onClick={handleMarkAllRead}
                sx={{ minWidth: 0, fontSize: 11 }}
              >
                Mark all read
              </Button>
              <Button
                size="small"
                onClick={clearAll}
                sx={{ minWidth: 0, fontSize: 11 }}
              >
                Clear
              </Button>
            </Box>
          </Box>
        </Box>
        <Divider />
        <List dense sx={{ maxHeight: 300, overflow: "auto" }}>
          {notifications.length === 0 ? (
            <ListItem>
              <ListItemText secondary="No notifications" />
            </ListItem>
          ) : (
            notifications.map((n) => (
              <ListItem
                key={n.id}
                disablePadding
                sx={{
                  opacity: n.read ? 0.6 : 1,
                  borderRadius: 2,
                  mx: 0.5,
                  "&:hover": { bgcolor: listRowHover },
                }}
              >
                <ListItemButton
                  onClick={() => handleMarkRead(n.id)}
                  sx={{ borderRadius: 2 }}
                >
                  <ListItemText
                    primary={n.title || n.message}
                    secondary={
                      n.body
                        ? `${n.body} · ${dayjs(n.time).format("DD-MM-YYYY HH:mm")}`
                        : dayjs(n.time).format("DD-MM-YYYY HH:mm")
                    }
                    primaryTypographyProps={{ fontSize: 13 }}
                    secondaryTypographyProps={{ fontSize: 11 }}
                  />
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismissNotification(n.id);
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </ListItemButton>
              </ListItem>
            ))
          )}
        </List>
      </Popover>

      <Popover
        open={Boolean(accountAnchorEl)}
        anchorEl={accountAnchorEl}
        onClose={() => setAccountAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            width: 240,
            mt: 1,
            borderRadius: 1,
            boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
            {user?.name}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", textTransform: "capitalize" }}
            noWrap
          >
            {user?.role}
          </Typography>
        </Box>
        <Divider />
        <List dense disablePadding>
          <ListItemButton
            onClick={() => {
              setAccountAnchorEl(null);
              setLogoutConfirmOpen(true);
            }}
            sx={{ py: 1.25, color: "error.main" }}
          >
            <LogoutIcon fontSize="small" sx={{ mr: 1.25 }} />
            <ListItemText primary="Log out" />
          </ListItemButton>
        </List>
      </Popover>

      <LogoutConfirmDialog
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={confirmLogout}
      />
    </>
  );
}
