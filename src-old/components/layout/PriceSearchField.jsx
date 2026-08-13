import { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { TextField, InputAdornment, useTheme } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import useAuthStore from "../../stores/authStore";
import { hasAnyPermission } from "../../utils/accessUtils";
import { getWorkspaceChromeColors } from "./workspaceChromeColors";

const PRICE_SEARCH_PERMISSIONS = [
  "inventory.view",
  "treatment_templates.view",
  "packages.view",
];

/**
 * @param {{ sx?: import("@mui/material").SxProps }} [props]
 */
export default function PriceSearchField({ sx }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const [searchDraft, setSearchDraft] = useState("");

  const workspacePrefix = location.pathname.split("/").filter(Boolean)[0] ?? "";
  const showPriceSearch =
    !location.pathname.startsWith("/doctor") &&
    hasAnyPermission(user, PRICE_SEARCH_PERMISSIONS);

  useEffect(() => {
    if (location.pathname.endsWith("/search")) {
      setSearchDraft(searchParams.get("q") ?? "");
    }
  }, [location.pathname, searchParams]);

  const submitPriceSearch = () => {
    const trimmed = searchDraft.trim();
    if (!workspacePrefix || workspacePrefix === "login") return;
    navigate(`/${workspacePrefix}/search?q=${encodeURIComponent(trimmed)}`);
  };

  if (!showPriceSearch) {
    return null;
  }

  const isDark = theme.palette.mode === "dark";
  const chrome = getWorkspaceChromeColors(isDark, theme);
  const titleColor = chrome.titleColor;
  const subtleText = chrome.utilitySubtle;

  return (
    <TextField
      variant="standard"
      size="small"
      placeholder="Price Search"
      value={searchDraft}
      onChange={(e) => setSearchDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submitPriceSearch();
        }
      }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ fontSize: 18, color: subtleText }} />
            </InputAdornment>
          ),
          sx: {
            color: titleColor,
            "&::placeholder": {
              color: subtleText,
              opacity: 1,
            },
            "&::-webkit-input-placeholder": {
              color: subtleText,
              opacity: 1,
            },
          },
        },
      }}
      sx={[
        {
          flex: { xs: 1, md: "0 0 auto" },
          minWidth: { xs: 0, md: 300 },
          width: { xs: "100%", md: 300 },
          maxWidth: { xs: "100%", md: 300 },
          "& .MuiOutlinedInput-root": {
            borderRadius: "12px",
            bgcolor: chrome.searchFieldBg,
            height: 38,
            fontSize: 13,
          },
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(255,255,255,0.12)",
          },
          // Beat global MuiOutlinedInput placeholder (theme.js dark purple)
          "& .MuiOutlinedInput-input": {
            "&&::placeholder": {
              color: subtleText,
              opacity: 1,
            },
            "&&::-webkit-input-placeholder": {
              color: subtleText,
              opacity: 1,
            },
          },
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
    />
  );
}
