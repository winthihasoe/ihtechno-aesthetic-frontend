import { create } from "zustand";
import { isDemoMode } from "../config/demoMode";
import { mockLogin, mockMe } from "../mocks/auth";
import apiClient, { resolveApiError } from "../services/apiClient";

const TOKEN_KEY = "dermafairy_token";
const USER_KEY = "dermafairy_user";

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem(USER_KEY)) || null,
  token: localStorage.getItem(TOKEN_KEY) || null,
  initialized: false,
  loading: false,
  error: null,

  initializeAuth: async () => {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      localStorage.removeItem(USER_KEY);
      set({ user: null, token: null, initialized: true });
      return;
    }

    try {
      if (isDemoMode) {
        const data = await mockMe(token);
        localStorage.setItem(USER_KEY, JSON.stringify(data));
        set({ user: data, token, initialized: true });
        return;
      }

      const { data } = await apiClient.get("/me");

      if (!data?.is_active) {
        throw new Error("Account deactivated");
      }

      localStorage.setItem(USER_KEY, JSON.stringify(data));
      set({ user: data, token, initialized: true });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      set({ user: null, token: null, initialized: true });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      let authPayload;

      if (isDemoMode) {
        authPayload = await mockLogin(email, password);
      } else {
        try {
          const { data } = await apiClient.post("/login", { email, password });
          authPayload = data;
        } catch (err) {
          // Only fall back to mock login when backend is unreachable (no HTTP response).
          if (err?.response) {
            throw err;
          }
          authPayload = await mockLogin(email, password);
        }
      }

      const { user, token } = authPayload;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      set({ user, token, initialized: true, loading: false });
      return user;
    } catch (err) {
      set({ error: resolveApiError(err, "Login failed."), loading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await apiClient.post("/logout");
    } catch {
      // ignore logout API failure and clear local state
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    set({ user: null, token: null, initialized: true });
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
