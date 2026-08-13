import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  Link,
} from "@mui/material";
import { Turnstile } from "@marsidev/react-turnstile";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import useAuthStore from "../../stores/authStore";
import useSettingsStore from "../../stores/settingsStore";
import { getClinicDisplayName } from "../../utils/clinicBranding";
import ClinicLogo from "../../components/common/ClinicLogo";
import { getFirstSidebarPath } from "../../utils/roleUtils";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useAuthStore();
  const { settings } = useSettingsStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [requiresCaptcha, setRequiresCaptcha] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const clinicTitle = getClinicDisplayName(settings);
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

  const captchaRequired = requiresCaptcha && !!TURNSTILE_SITE_KEY;
  const submitDisabled = loading || (captchaRequired && !turnstileToken);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    try {
      const user = await login(
        email,
        password,
        captchaRequired ? turnstileToken : null,
      );
      navigate(getFirstSidebarPath(user), { replace: true });
    } catch (err) {
      if (err?.response?.data?.requires_captcha) {
        setRequiresCaptcha(true);
        setTurnstileToken(null);
        setTurnstileKey((key) => key + 1);
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "transparent",
        overflowY: "auto",
        overscrollBehavior: "contain",
        p: { xs: 1, sm: 2 },
      }}
    >
      <Card sx={{ width: "100%", maxWidth: 400 }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                bgcolor: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 1.5,
                overflow: "hidden",
              }}
            >
              <ClinicLogo
                alt={clinicTitle}
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </Box>
            <Typography variant="h5" gutterBottom>
              {clinicTitle}
            </Typography>
            {clinicTagline ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 0.5 }}
              >
                {clinicTagline}
              </Typography>
            ) : null}
            <Typography variant="body2" color="text.secondary">
              Sign in to continue
            </Typography>
            {hasContact ? (
              <Box
                sx={{
                  mt: 1.5,
                  textAlign: "center",
                  px: 0.5,
                }}
              >
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
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              autoComplete="email"
              autoFocus
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
                    <IconButton onClick={() => setShowPw((p) => !p)} edge="end">
                      {showPw ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {captchaRequired ? (
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <Turnstile
                  key={turnstileKey}
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={setTurnstileToken}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() => setTurnstileToken(null)}
                />
              </Box>
            ) : null}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitDisabled}
              fullWidth
              sx={{ mt: 1, py: 1.2 }}
            >
              {loading ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                "Sign In"
              )}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
