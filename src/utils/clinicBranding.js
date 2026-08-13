/** Shown when `app_settings.clinic_name` is empty or still loading. */
export const FALLBACK_CLINIC_DISPLAY_NAME = "Clinic";

export function getClinicDisplayName(settings) {
  const raw = settings?.clinic_name;
  const n = typeof raw === "string" ? raw.trim() : "";
  if (n) return n;
  return FALLBACK_CLINIC_DISPLAY_NAME;
}

/** Browser tab: `clinic_name - clinic_description` when both are set. */
export function getClinicBrowserTabTitle(settings) {
  const rawName = settings?.clinic_name;
  const rawDesc = settings?.clinic_description;
  const name = typeof rawName === "string" ? rawName.trim() : "";
  const desc =
    typeof rawDesc === "string" ? rawDesc.trim().replace(/\s+/g, " ") : "";
  if (name && desc) return `${name} - ${desc}`;
  if (name) return name;
  if (desc) return desc;
  return FALLBACK_CLINIC_DISPLAY_NAME;
}

/** Two-letter mark when no logo is configured (from clinic name). */
export function getClinicMarkLetters(settings) {
  const raw = settings?.clinic_name;
  const name = typeof raw === "string" ? raw.trim() : "";
  if (!name) return "—";
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase().slice(0, 2);
  }
  return name.slice(0, 2).toUpperCase();
}
