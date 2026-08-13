/**
 * Human label for API `check_in_mode` on visits (physical | online).
 */
export function formatCheckInModeLabel(mode) {
  if (mode === "online") return "Online";
  if (mode === "physical") return "Physical";
  return "—";
}
