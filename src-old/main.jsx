import { createRoot } from "react-dom/client";
import Echo from "laravel-echo";
import Pusher from "pusher-js";
import App from "./App.jsx";
import { applyDefaultFaviconSync } from "./utils/browserFavicon";

applyDefaultFaviconSync();

window.Pusher = Pusher;

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const baseUrl = apiUrl.endsWith("/api") ? apiUrl.slice(0, -4) : apiUrl;
const token = localStorage.getItem("dermafairy_token");

window.Echo = new Echo({
  broadcaster: "reverb",
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST || "localhost",
  wsPort: Number(import.meta.env.VITE_REVERB_PORT) || 8080,
  wssPort: Number(import.meta.env.VITE_REVERB_PORT) || 443,
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME || "http") === "https",
  enabledTransports: ["ws", "wss"],
  disableStats: true,
  authEndpoint: `${baseUrl}/broadcasting/auth`,
  auth: {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        }
      : { Accept: "application/json" },
  },
});

createRoot(document.getElementById("root")).render(<App />);
