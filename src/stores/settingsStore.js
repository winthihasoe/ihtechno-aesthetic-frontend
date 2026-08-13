import { create } from "zustand";
import { BRAND_COLORS } from "../theme/brandColors";
import { DEFAULT_LIVEBOARD_RULES } from "../utils/roleUtils";
import {
  getSettings,
  updateInvoiceNextNumber,
  updateSettings,
} from "../services/settingsService";

export const DEFAULT_BRAND_COLORS = {
  primary_color: BRAND_COLORS.primary,
  secondary_color: BRAND_COLORS.secondary,
  background_color: BRAND_COLORS.background,
  sidebar_accent_color: BRAND_COLORS.sidebarAccent,
};

const DEFAULT_CLINIC = {
  clinic_name: "Beautisoon",
  clinic_description: "Aesthetic clinic in Yangon — skincare, laser treatments, injectables, and beauty wellness",
  clinic_address:
    "Level 4, Junction City, Kyun Taw Road, Kamayut Township, Yangon 11041, Myanmar",
  clinic_phones: ["09-779-123-456", "01-230-4567"],
  clinic_emails: ["hello@beautisoon.com"],
  clinic_website: "https://beautisoon.com",
};

const DEFAULT_SETTINGS = {
  logo_url: null,
  ...DEFAULT_BRAND_COLORS,
  ...DEFAULT_CLINIC,
  invoice_next_number: 1,
  appointment_hours_start: "09:00",
  appointment_hours_end: "18:00",
  hr_default_grace_minutes: 10,
  hr_default_shift_start: "09:00",
  hr_default_shift_end: "18:00",
  default_branch_id: null,
  vat_enabled: false,
  default_vat_percent: 0,
  liveboard_rules: DEFAULT_LIVEBOARD_RULES,
  assign_doctor_roles: ["medical_officer", "dermatologist", "senior_nurse", "owner"],
  inventory_fifo_ownership_preference: "purchased",
};

const useSettingsStore = create((set) => ({
  settings: DEFAULT_SETTINGS,
  loading: false,

  fetchSettings: async () => {
    set({ loading: true });
    try {
      const data = await getSettings();
      set({ settings: { ...DEFAULT_SETTINGS, ...data }, loading: false });
      return data;
    } catch {
      set({ loading: false });
      return null;
    }
  },

  saveSettings: async (payload) => {
    const data = await updateSettings(payload);
    set({ settings: { ...DEFAULT_SETTINGS, ...data } });
    return data;
  },

  saveInvoiceNextNumber: async (value) => {
    const data = await updateInvoiceNextNumber(value);
    set((state) => ({
      settings: {
        ...state.settings,
        invoice_next_number: data.invoice_next_number,
      },
    }));
    return data;
  },
}));

export default useSettingsStore;
