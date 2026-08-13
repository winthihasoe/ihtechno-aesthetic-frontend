import axios from "axios";
import { isDemoMode } from "../config/demoMode";
import { createMockAdapter } from "../mocks/mockApiHandler";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000/api",
  headers: {
    Accept: "application/json",
  },
});

if (isDemoMode) {
  apiClient.defaults.adapter = createMockAdapter();
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("dermafairy_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isDemoMode) {
      return Promise.reject(error);
    }

    const status = error?.response?.status;
    const message = error?.response?.data?.message;
    const requestUrl = error?.config?.url || "";
    const isLoginRequest = requestUrl.includes("/login");
    const isAuthFailure =
      status === 401 ||
      (status === 403 &&
        typeof message === "string" &&
        message.toLowerCase().includes("deactivated"));

    if (isAuthFailure && !isLoginRequest) {
      localStorage.removeItem("dermafairy_token");
      localStorage.removeItem("dermafairy_user");

      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  },
);

export const resolveApiError = (error, fallback = "Something went wrong") => {
  const message = error?.response?.data?.message;
  const validationErrors = error?.response?.data?.errors;

  if (validationErrors && typeof validationErrors === "object") {
    const firstError = Object.values(validationErrors)?.[0]?.[0];
    if (firstError) return firstError;
  }

  if (message) return message;

  return error?.message || fallback;
};

export default apiClient;
