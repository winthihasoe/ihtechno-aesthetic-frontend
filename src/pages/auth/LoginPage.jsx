import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  Link,
  Stack,
  Chip,
  useTheme,
  useMediaQuery,
  alpha,
} from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import LoginIcon from "@mui/icons-material/Login";
import ScienceIcon from "@mui/icons-material/Science";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import useAuthStore from "../../stores/authStore";
import useSettingsStore from "../../stores/settingsStore";
import { getClinicDisplayName } from "../../utils/clinicBranding";
import { getPostLoginPath } from "../../utils/roleUtils";
import { DEMO_LOGIN_ACCOUNTS, DEMO_PASSWORD } from "../../mocks/demoDatabase";
import { isDemoMode } from "../../config/demoMode";
import {
  BRAND_COLORS,
  brandRgba,
  getLoginBackgroundLight,
} from "../../theme/brandColors";

/** Light theme locks html/body/#root overflow; unlock so the login page can always scroll. */
function useLoginPageScrollUnlock() {
  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const root = document.getElementById("root");

    const prev = {
      htmlOverflow: html.style.getPropertyValue("overflow"),
      htmlOverflowPriority: html.style.getPropertyPriority("overflow"),
      htmlHeight: html.style.getPropertyValue("height"),
      htmlHeightPriority: html.style.getPropertyPriority("height"),
      bodyOverflow: body.style.getPropertyValue("overflow"),
      bodyOverflowPriority: body.style.getPropertyPriority("overflow"),
      bodyHeight: body.style.getPropertyValue("height"),
      bodyHeightPriority: body.style.getPropertyPriority("height"),
      rootOverflow: root?.style.getPropertyValue("overflow") ?? "",
      rootOverflowPriority: root?.style.getPropertyPriority("overflow") ?? "",
      rootHeight: root?.style.getPropertyValue("height") ?? "",
      rootHeightPriority: root?.style.getPropertyPriority("height") ?? "",
      rootMinHeight: root?.style.getPropertyValue("min-height") ?? "",
      rootMinHeightPriority:
        root?.style.getPropertyPriority("min-height") ?? "",
    };

    const unlock = (el, prop, value) => {
      el.style.setProperty(prop, value, "important");
    };

    unlock(html, "overflow", "auto");
    unlock(html, "height", "auto");
    unlock(body, "overflow", "auto");
    unlock(body, "height", "auto");
    if (root) {
      unlock(root, "overflow", "visible");
      unlock(root, "height", "auto");
      unlock(root, "min-height", "100%");
    }

    const restore = (el, prop, value, priority) => {
      if (!el) return;
      if (value) el.style.setProperty(prop, value, priority || undefined);
      else el.style.removeProperty(prop);
    };

    return () => {
      restore(html, "overflow", prev.htmlOverflow, prev.htmlOverflowPriority);
      restore(html, "height", prev.htmlHeight, prev.htmlHeightPriority);
      restore(body, "overflow", prev.bodyOverflow, prev.bodyOverflowPriority);
      restore(body, "height", prev.bodyHeight, prev.bodyHeightPriority);
      restore(root, "overflow", prev.rootOverflow, prev.rootOverflowPriority);
      restore(root, "height", prev.rootHeight, prev.rootHeightPriority);
      restore(
        root,
        "min-height",
        prev.rootMinHeight,
        prev.rootMinHeightPriority,
      );
    };
  }, []);
}

function DemoAccountPanel({ accounts, onSelect, compact = false }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  if (!accounts.length) return null;

  return (
    <Box
      sx={{
        height: { xs: "auto", md: "100%" },
        display: "flex",
        flexDirection: "column",
        p: { xs: 2.5, md: 3.5 },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
        <ScienceIcon
          sx={{
            fontSize: 20,
            color: isDark ? "primary.light" : "primary.main",
          }}
        />
        <Typography variant="subtitle1" fontWeight={700} letterSpacing={-0.2}>
          Demo Access
        </Typography>
      </Stack>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 2.5, lineHeight: 1.55 }}
      >
        Explore the platform instantly. Select a role below — password is{" "}
        <Box
          component="span"
          sx={{
            fontFamily: "monospace",
            fontWeight: 600,
            color: "text.primary",
            bgcolor: isDark
              ? alpha(theme.palette.common.white, 0.06)
              : alpha(BRAND_COLORS.primary, 0.08),
            px: 0.75,
            py: 0.15,
            borderRadius: 0.75,
            fontSize: "0.8rem",
          }}
        >
          {DEMO_PASSWORD}
        </Box>
      </Typography>

      <Stack spacing={1.25} sx={{ flex: 1 }}>
        {accounts.map((account) => (
          <Box
            key={account.email}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(account.email)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(account.email);
              }
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: compact ? 1.25 : 1.5,
              borderRadius: 2,
              cursor: "pointer",
              border: 1,
              borderColor: isDark
                ? alpha(theme.palette.common.white, 0.1)
                : alpha(BRAND_COLORS.primary, 0.12),
              bgcolor: isDark
                ? alpha(theme.palette.common.white, 0.03)
                : "background.paper",
              transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
              "&:hover": {
                borderColor: "primary.main",
                boxShadow: `0 4px 16px ${brandRgba("primary", 0.12)}`,
                transform: "translateY(-1px)",
              },
              "&:focus-visible": {
                outline: "2px solid",
                outlineColor: "primary.main",
                outlineOffset: 2,
              },
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: "primary.main",
                fontWeight: 700,
                fontSize: "0.875rem",
              }}
            >
              {account.name.charAt(0)}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {account.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                display="block"
              >
                {account.email}
              </Typography>
            </Box>
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{ flexShrink: 0 }}
            >
              <Chip
                label={account.role}
                size="small"
                sx={{
                  height: 22,
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: "primary.main",
                  "& .MuiChip-label": { px: 1 },
                }}
              />
              <ArrowForwardIcon
                sx={{
                  fontSize: 16,
                  color: "text.disabled",
                  display: { xs: "none", sm: "block" },
                }}
              />
            </Stack>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

export default function LoginPage() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useAuthStore();
  const { settings } = useSettingsStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  useLoginPageScrollUnlock();

  const isLight = theme.palette.mode === "light";
  const isDark = !isLight;
  const showDemo = isDemoMode && DEMO_LOGIN_ACCOUNTS.length > 0;
  const clinicTitle = getClinicDisplayName(settings);
  const logoPath = settings?.logo_url || "/images/logo.png";
  const clinicTagline =
    typeof settings?.clinic_description === "string"
      ? settings.clinic_description.trim()
      : "";
  const clinicAddress =
    typeof settings?.clinic_address === "string"
      ? settings.clinic_address.trim()
      : "";
  const clinicPhones = Array.isArray(settings?.clinic_phones)
    ? settings.clinic_phones.filter(Boolean)
    : [];
  const clinicEmails = Array.isArray(settings?.clinic_emails)
    ? settings.clinic_emails.filter(Boolean)
    : [];
  const clinicWebsite =
    typeof settings?.clinic_website === "string"
      ? settings.clinic_website.trim()
      : "";
  const hasContact =
    clinicAddress ||
    clinicPhones.length > 0 ||
    clinicEmails.length > 0 ||
    clinicWebsite;

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    try {
      const user = await login(email, password);
      navigate(getPostLoginPath(user), { replace: true });
    } catch {
      // error shown via store
    }
  };

  const handleDemoSelect = (demoEmail) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    clearError();
  };

  const loginPanel = (
    <Box
      sx={{
        p: { xs: 2.5, sm: 3.5, md: 4 },
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {/* Brand */}
      <Box
        sx={{
          mb: 3,
          textAlign: { xs: "center", md: "left" },
        }}
      >
        <Box
          component="img"
          src={logoPath}
          alt={clinicTitle}
          sx={{
            width: { xs: 100, sm: 130 },
            height: { xs: 40, sm: 52 },
            objectFit: "contain",
            display: "block",
            mx: { xs: "auto", md: 0 },
            mb: { xs: 1.5, md: 2 },
          }}
        />
        <Typography
          variant="h5"
          sx={{
            fontSize: { xs: "1.2rem", sm: "1.35rem", md: "1.6rem" },
            fontWeight: 700,
            letterSpacing: -0.3,
            lineHeight: 1.3,
            mb: 0.5,
            display: { xs: "block", md: "none" },
          }}
        >
          {clinicTitle}
        </Typography>
        {clinicTagline ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mb: 0.5,
              lineHeight: 1.5,
              display: { xs: "-webkit-box", md: "none" },
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {clinicTagline}
          </Typography>
        ) : null}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            lineHeight: 1.6,
            display: { xs: "block", md: "none" },
          }}
        >
          Sign in to continue
        </Typography>
        <Typography
          variant="h4"
          sx={{
            fontSize: { md: "1.6rem" },
            fontWeight: 700,
            letterSpacing: -0.5,
            lineHeight: 1.25,
            mb: 0.5,
            display: { xs: "none", md: "block" },
          }}
        >
          Welcome back
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            lineHeight: 1.6,
            display: { xs: "none", md: "block" },
          }}
        >
          Sign in to <strong>{clinicTitle}</strong>
          {clinicTagline ? ` — ${clinicTagline}` : ""}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <TextField
          label="Email address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          fullWidth
          autoComplete="email"
          autoFocus={isDesktop}
        />
        <TextField
          label="Password"
          type={showPw ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          fullWidth
          autoComplete="current-password"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => setShowPw((p) => !p)}
                  edge="end"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <VisibilityOffIcon /> : <VisibilityIcon />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading}
          fullWidth
          startIcon={loading ? null : <LoginIcon />}
          sx={{
            mt: 0.5,
            py: 1.4,
            fontWeight: 600,
            boxShadow: `0 4px 14px ${brandRgba("primary", 0.35)}`,
          }}
        >
          {loading ? <CircularProgress size={22} color="inherit" /> : "Sign in"}
        </Button>
      </Box>

      {hasContact && !showDemo ? (
        <Box sx={{ mt: 3, pt: 2.5, borderTop: 1, borderColor: "divider" }}>
          {clinicAddress ? (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              {clinicAddress}
            </Typography>
          ) : null}
          {clinicPhones.length > 0 ? (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              {clinicPhones.join(" · ")}
            </Typography>
          ) : null}
          {clinicEmails.length > 0 ? (
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              {clinicEmails.join(" · ")}
            </Typography>
          ) : null}
          {clinicWebsite ? (
            <Link
              href={
                /^https?:\/\//i.test(clinicWebsite)
                  ? clinicWebsite
                  : `https://${clinicWebsite}`
              }
              target="_blank"
              rel="noopener noreferrer"
              variant="caption"
              sx={{ display: "block", mt: 0.25 }}
            >
              {clinicWebsite}
            </Link>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );

  return (
    <Box
      component="main"
      sx={{
        position: "fixed",
        inset: 0,
        zIndex: 2,
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
        overflowY: "auto",
        overscrollBehaviorY: "contain",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-y",
        ...(isLight
          ? {
              bgcolor: "#eef0ec",
              backgroundImage: getLoginBackgroundLight(),
              backgroundAttachment: "local",
              backgroundSize: "cover",
            }
          : {
              bgcolor: "background.default",
            }),
      }}
    >
      <Box
        sx={{
          height: 4,
          flexShrink: 0,
          background: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
        }}
      />

      <Box
        sx={{
          flex: "1 0 auto",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 3, md: 4 },
          pb: {
            xs: "calc(24px + env(safe-area-inset-bottom, 0px))",
            md: 4,
          },
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: showDemo ? { xs: 440, md: 920 } : 440,
            borderRadius: { xs: 3, md: 4 },
            overflow: "hidden",
            bgcolor: "background.paper",
            boxShadow: isLight
              ? `0 8px 40px ${brandRgba("text", 0.08)}, 0 2px 8px ${brandRgba("text", 0.04)}`
              : 8,
            border: 1,
            borderColor: isDark
              ? alpha(theme.palette.common.white, 0.08)
              : alpha(BRAND_COLORS.primary, 0.08),
          }}
        >
          {showDemo && isDesktop ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                alignItems: "stretch",
              }}
            >
              <Box
                sx={{
                  borderRight: 1,
                  borderColor: "divider",
                }}
              >
                {loginPanel}
              </Box>
              <Box
                sx={{
                  bgcolor: isDark
                    ? alpha(theme.palette.primary.main, 0.06)
                    : alpha(BRAND_COLORS.primary, 0.04),
                }}
              >
                <DemoAccountPanel
                  accounts={DEMO_LOGIN_ACCOUNTS}
                  onSelect={handleDemoSelect}
                />
              </Box>
            </Box>
          ) : (
            <Box>
              {loginPanel}
              {showDemo ? (
                <Box
                  sx={{
                    borderTop: 1,
                    borderColor: "divider",
                    bgcolor: isDark
                      ? alpha(theme.palette.primary.main, 0.06)
                      : alpha(BRAND_COLORS.primary, 0.04),
                  }}
                >
                  <DemoAccountPanel
                    accounts={DEMO_LOGIN_ACCOUNTS}
                    onSelect={handleDemoSelect}
                    compact
                  />
                </Box>
              ) : null}
            </Box>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          textAlign: "center",
          pb: {
            xs: "calc(16px + env(safe-area-inset-bottom, 0px))",
            md: 2.5,
          },
          px: 2,
        }}
      >
        <Typography variant="body2" color="text.disabled">
          {clinicTitle} · Secure clinic management
        </Typography>
        <Typography variant="caption" color="text.disabled">
          Powered by{" "}
          <a
            href="https://ihtechno.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            Ihtechno
          </a>
        </Typography>
      </Box>
    </Box>
  );
}
