/** When true, all API calls are served from in-memory demo data (no Laravel backend). */
export const isDemoMode =
  import.meta.env.VITE_DEMO_MODE === "true" ||
  import.meta.env.VITE_DEMO_MODE === "1";
