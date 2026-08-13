import { create } from "zustand";
import { DEFAULT_LIVEBOARD_RULES } from "../utils/roleUtils";
import {
  getSettings,
  updateInvoiceNextNumber,
  updateSettings,
} from "../services/settingsService";
import { applyBrowserFavicon } from "../utils/browserFavicon";

export const DEFAULT_BRAND_COLORS = {
  primary_color: "#422442",
  secondary_color: "#FFB56A",
  background_color: "#F9F5F8",
  sidebar_accent_color: "#6BBF9E",
};

const DEFAULT_SETTINGS = {
  logo_url: null,
  ...DEFAULT_BRAND_COLORS,
  clinic_name: null,
  clinic_description: null,
  clinic_address: null,
  clinic_phones: [],
  clinic_emails: [],
  clinic_website: null,
  invoice_next_number: 1,
  appointment_hours_start: "09:00",
  appointment_hours_end: "18:00",
  default_consultation_fee: 25000,
  hr_default_grace_minutes: 10,
  hr_default_shift_start: "09:00",
  hr_default_shift_end: "18:00",
  default_branch_id: null,
  vat_enabled: false,
  default_vat_percent: 0,
  liveboard_rules: DEFAULT_LIVEBOARD_RULES,
  assign_doctor_roles: ["medical_officer", "physician", "owner"],
  inventory_fifo_ownership_preference: "purchased",
  inventory_material_cost_basis: "weighted_average",
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
    const settings = { ...DEFAULT_SETTINGS, ...data };
    set({ settings });
    void applyBrowserFavicon(settings);
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
