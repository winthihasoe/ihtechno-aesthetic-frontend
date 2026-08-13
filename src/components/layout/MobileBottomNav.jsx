import {
  BottomNavigation,
  BottomNavigationAction,
  Paper,
} from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { NAV_ICONS } from "./navIcons";

export default function MobileBottomNav({
  primarySections,
  activeSection,
  onSectionSelect,
  onMoreClick,
}) {
  const activeId = activeSection?.id;
  const value = primarySections.some((s) => s.id === activeId)
    ? activeId
    : "more";

  const iconSx = { fontSize: 20, display: "block" };

  return (
    <Paper
      elevation={0}
      sx={{
        display: { xs: "block", sm: "none" },
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        borderRadius: 0,
        pb: "env(safe-area-inset-bottom, 0px)",
        backgroundImage: "none",
        bgcolor: (theme) =>
          theme.palette.mode === "dark" ? "#161b22" : "#ffffff",
        borderTop: (theme) =>
          theme.palette.mode === "dark"
            ? "1px solid rgba(255,255,255,0.08)"
            : "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 -1px 8px rgba(0,0,0,0.06)",
      }}
    >
      <BottomNavigation
        value={value}
        showLabels
        sx={{
          height: 52,
          bgcolor: "transparent",
          backgroundImage: "none",
          "& .MuiBottomNavigationAction-root": {
            minWidth: 0,
            maxWidth: "none",
            flex: 1,
            px: 0.25,
            py: 0.5,
            gap: 0.25,
            color: "text.secondary",
            transition: "color 0.2s",
            "&.Mui-selected": {
              color: "primary.main",
              pt: 0.5,
            },
          },
          "& .MuiBottomNavigationAction-label": {
            fontSize: "0.625rem",
            lineHeight: 1.2,
            mt: 0.25,
            opacity: 1,
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            transition: "color 0.2s, font-weight 0.2s",
            "&.Mui-selected": {
              fontSize: "0.625rem",
              fontWeight: 600,
            },
          },
          "& .MuiBottomNavigationAction-root .MuiSvgIcon-root": {
            fontSize: 20,
          },
        }}
      >
        {primarySections.map((section) => {
          const Icon = NAV_ICONS[section.icon] ?? NAV_ICONS.Dashboard;
          return (
            <BottomNavigationAction
              key={section.id}
              value={section.id}
              label={section.label}
              icon={<Icon sx={iconSx} />}
              onClick={() => onSectionSelect(section)}
            />
          );
        })}
        <BottomNavigationAction
          value="more"
          label="More"
          icon={<MoreHorizIcon sx={iconSx} />}
          onClick={onMoreClick}
        />
      </BottomNavigation>
    </Paper>
  );
}
