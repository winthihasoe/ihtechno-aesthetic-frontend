import { AppBar, Toolbar, IconButton } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import TopbarUtilities from "./TopbarUtilities";

/** @deprecated Use AppTopNav — kept for any legacy imports during transition. */
export default function Topbar({ onMenuClick }) {
  return (
    <AppBar position="sticky" elevation={0}>
      <Toolbar sx={{ gap: 1, px: { xs: 1, sm: 2.5 }, minHeight: { xs: 56, sm: 64 } }}>
        <IconButton
          edge="start"
          onClick={onMenuClick}
          sx={{ display: { sm: "none" }, mr: 0.5 }}
        >
          <MenuIcon />
        </IconButton>
        <TopbarUtilities />
      </Toolbar>
    </AppBar>
  );
}
