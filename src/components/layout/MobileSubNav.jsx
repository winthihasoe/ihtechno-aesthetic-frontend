import { Link, useLocation } from "react-router-dom";
import { Box, Chip } from "@mui/material";
import { isSidebarNavItemActive } from "../../utils/sidebarNavActive";

export default function MobileSubNav({ items }) {
  const { pathname } = useLocation();

  if (!items?.length) return null;

  return (
    <Box
      sx={{
        display: { xs: "flex", sm: "none" },
        gap: 0.75,
        px: 1,
        py: 0.75,
        overflowX: "auto",
        flexShrink: 0,
        borderBottom: (theme) =>
          theme.palette.mode === "dark"
            ? "1px solid rgba(255,255,255,0.08)"
            : "1px solid rgba(0,0,0,0.08)",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      {items.map((item) => {
        const active = isSidebarNavItemActive(pathname, item.path);
        return (
          <Chip
            key={item.path}
            component={Link}
            to={item.path}
            clickable
            label={item.label}
            size="small"
            color={active ? "secondary" : "default"}
            variant={active ? "filled" : "outlined"}
            sx={{
              flexShrink: 0,
              minHeight: 36,
              fontWeight: active ? 600 : 500,
              "& .MuiChip-label": { px: 1.25 },
            }}
          />
        );
      })}
    </Box>
  );
}
