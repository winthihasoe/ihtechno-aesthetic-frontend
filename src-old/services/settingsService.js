import apiClient from "./apiClient";

export const getSettings = async () => {
  const { data } = await apiClient.get("/settings");
  return data;
};

export const updateSettings = async (payload) => {
  const formData = new FormData();

  if (payload.logo) {
    formData.append("logo", payload.logo);
  }

  if (payload.remove_logo) {
    formData.append("remove_logo", "1");
  }

  formData.append("primary_color", payload.primary_color ?? "");
  formData.append("secondary_color", payload.secondary_color ?? "");
  formData.append("background_color", payload.background_color ?? "");
  formData.append("sidebar_accent_color", payload.sidebar_accent_color ?? "");

  formData.append("clinic_name", payload.clinic_name ?? "");
  formData.append("clinic_description", payload.clinic_description ?? "");
  formData.append("clinic_address", payload.clinic_address ?? "");
  formData.append("clinic_website", payload.clinic_website ?? "");
  formData.append("clinic_phones", payload.clinic_phones ?? "[]");
  formData.append("clinic_emails", payload.clinic_emails ?? "[]");

  if (payload.appointment_hours_start != null) {
    formData.append("appointment_hours_start", payload.appointment_hours_start);
  }
  if (payload.appointment_hours_end != null) {
    formData.append("appointment_hours_end", payload.appointment_hours_end);
  }

  if (payload.default_consultation_fee !== undefined && payload.default_consultation_fee !== null && payload.default_consultation_fee !== "") {
    formData.append("default_consultation_fee", String(payload.default_consultation_fee));
  }

  if (payload.default_branch_id !== undefined && payload.default_branch_id !== null && payload.default_branch_id !== "") {
    formData.append("default_branch_id", String(payload.default_branch_id));
  }
  if (payload.vat_enabled !== undefined) {
    formData.append("vat_enabled", payload.vat_enabled ? "1" : "0");
  }
  if (payload.default_vat_percent !== undefined && payload.default_vat_percent !== null && payload.default_vat_percent !== "") {
    formData.append("default_vat_percent", String(payload.default_vat_percent));
  }
  if (payload.hr_default_grace_minutes !== undefined && payload.hr_default_grace_minutes !== null && payload.hr_default_grace_minutes !== "") {
    formData.append("hr_default_grace_minutes", String(payload.hr_default_grace_minutes));
  }
  if (payload.hr_default_shift_start != null) {
    formData.append("hr_default_shift_start", payload.hr_default_shift_start);
  }
  if (payload.hr_default_shift_end != null) {
    formData.append("hr_default_shift_end", payload.hr_default_shift_end);
  }
  if (payload.hr_absence_penalty_multiplier !== undefined && payload.hr_absence_penalty_multiplier !== null && payload.hr_absence_penalty_multiplier !== "") {
    formData.append("hr_absence_penalty_multiplier", String(payload.hr_absence_penalty_multiplier));
  }
  if (payload.hr_daily_salary_divisor !== undefined && payload.hr_daily_salary_divisor !== null && payload.hr_daily_salary_divisor !== "") {
    formData.append("hr_daily_salary_divisor", String(payload.hr_daily_salary_divisor));
  }
  if (payload.hr_default_annual_leave_days !== undefined && payload.hr_default_annual_leave_days !== null && payload.hr_default_annual_leave_days !== "") {
    formData.append("hr_default_annual_leave_days", String(payload.hr_default_annual_leave_days));
  }
  if (payload.hr_default_sick_leave_days !== undefined && payload.hr_default_sick_leave_days !== null && payload.hr_default_sick_leave_days !== "") {
    formData.append("hr_default_sick_leave_days", String(payload.hr_default_sick_leave_days));
  }

  if (payload.assign_doctor_roles !== undefined) {
    formData.append("assign_doctor_roles", payload.assign_doctor_roles ?? "[]");
  }

  if (payload.inventory_fifo_ownership_preference != null) {
    formData.append(
      "inventory_fifo_ownership_preference",
      payload.inventory_fifo_ownership_preference,
    );
  }

  if (payload.inventory_material_cost_basis != null) {
    formData.append(
      "inventory_material_cost_basis",
      payload.inventory_material_cost_basis,
    );
  }

  const { data } = await apiClient.post("/settings", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};

export const updateInvoiceNextNumber = async (invoiceNextNumber) => {
  const { data } = await apiClient.put("/settings/invoice-next-number", {
    invoice_next_number: invoiceNextNumber,
  });
  return data;
};

export const getLiveboardRules = async () => {
  const { data } = await apiClient.get("/settings/liveboard-rules");
  return data?.liveboard_rules ?? {};
};

export const updateLiveboardRules = async (liveboardRules) => {
  const { data } = await apiClient.put("/settings/liveboard-rules", {
    liveboard_rules: liveboardRules,
  });
  return data?.liveboard_rules ?? {};
};

export const getLiveboardCloseSettings = async () => {
  const { data } = await apiClient.get("/settings/liveboard-close");
  return data;
};

export const updateLiveboardCloseSettings = async (payload) => {
  const { data } = await apiClient.put("/settings/liveboard-close", payload);
  return data;
};

export const getAssignableRoleOptions = async () => {
  const { data } = await apiClient.get("/settings/assignable-roles/options");
  return Array.isArray(data?.roles) ? data.roles : [];
};
