import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { useEffect, useMemo } from "react";
import createAppTheme from "./theme/theme";
import AppRoutes from "./routes/AppRoutes";
import GlobalToast from "./components/common/GlobalToast";
import GlobalConfirmDialog from "./components/common/GlobalConfirmDialog";
import useSettingsStore from "./stores/settingsStore";
import useThemeModeStore, {
  THEME_MODE_STORAGE_KEY,
} from "./stores/themeModeStore";
import useAuthStore from "./stores/authStore";
import { getClinicBrowserTabTitle } from "./utils/clinicBranding";
import { applyBrowserFavicon } from "./utils/browserFavicon";

export default function App() {
  const { settings, fetchSettings } = useSettingsStore();
  const themeMode = useThemeModeStore((s) => s.themeMode);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    let cancelled = false;

    applyBrowserFavicon(settings).catch(() => {
      if (!cancelled) {
        applyBrowserFavicon({ logo_url: null });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [settings.logo_url]);

  useEffect(() => {
    document.title = getClinicBrowserTabTitle(settings);
  }, [settings]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== THEME_MODE_STORAGE_KEY || e.newValue == null) return;
      useThemeModeStore.setState({
        themeMode: e.newValue === "dark" ? "dark" : "light",
      });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const preventNumberWheelChange = (event) => {
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement &&
        active.type === "number" &&
        active === event.target
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener("wheel", preventNumberWheelChange, {
      passive: false,
      capture: true,
    });
    return () =>
      window.removeEventListener("wheel", preventNumberWheelChange, {
        capture: true,
      });
  }, []);

  const theme = useMemo(
    () => createAppTheme({ ...settings, theme_mode: themeMode }),
    [settings, themeMode],
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
      <GlobalToast />
      <GlobalConfirmDialog />
    </ThemeProvider>
  );
}
