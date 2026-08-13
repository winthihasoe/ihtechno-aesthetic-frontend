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

  return (
    <Paper
      elevation={8}
      sx={{
        display: { xs: "block", sm: "none" },
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        borderRadius: 0,
        pb: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <BottomNavigation
        value={value}
        showLabels
        sx={{
          minHeight: 48,
          "& .MuiBottomNavigationAction-root": {
            minWidth: 0,
            py: 0.5,
            "&.Mui-selected": { fontSize: 9 },
          },
          "& .MuiBottomNavigationAction-label": {
            fontSize: 9,
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
              icon={<Icon sx={{ fontSize: 18 }} />}
              onClick={() => onSectionSelect(section)}
            />
          );
        })}
        <BottomNavigationAction
          value="more"
          label="More"
          icon={<MoreHorizIcon sx={{ fontSize: 18 }} />}
          onClick={onMoreClick}
        />
      </BottomNavigation>
    </Paper>
  );
}
