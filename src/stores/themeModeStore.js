import { create } from "zustand";

export const THEME_MODE_STORAGE_KEY = "dermafairy.theme_mode";

function readStoredMode() {
  try {
    const v = localStorage.getItem(THEME_MODE_STORAGE_KEY);
    return v === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

const useThemeModeStore = create((set) => ({
  themeMode: typeof window !== "undefined" ? readStoredMode() : "light",
  setThemeMode: (mode) => {
    const next = mode === "dark" ? "dark" : "light";
    try {
      localStorage.setItem(THEME_MODE_STORAGE_KEY, next);
    } catch {
      /* private mode / quota */
    }
    set({ themeMode: next });
  },
}));

export default useThemeModeStore;
