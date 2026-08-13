import apiClient from "./apiClient";

export const getPatients = async (params = {}) => {
  const { data } = await apiClient.get("/patients", { params });
  return data;
};

/** Lightweight name/phone search for appointment picker (min 2 characters). */
export const searchPatientsAutocomplete = async (search, limit = 20) => {
  const { data } = await apiClient.get("/patients/autocomplete", {
    params: { search, limit },
  });
  return data;
};

export const getAppointmentPackageOptions = async (patientId) => {
  const { data } = await apiClient.get(
    `/patients/${patientId}/appointment-package-options`,
  );
  return data;
};

/** Paginated patient search for check-in (name substring or exact phone). */
export const searchPatientsForCheckIn = async ({ search, phone }) => {
  const params = { per_page: 50 };
  if (phone) {
    params.phone = phone;
  } else if (search) {
    params.search = search;
  }
  const { data } = await apiClient.get("/patients", { params });
  return data;
};

export const getPatient = async (id) => {
  const { data } = await apiClient.get(`/patients/${id}`);
  return data;
};

export const createPatient = async (payload) => {
  const { data } = await apiClient.post("/patients", payload);
  return data;
};

export const updatePatient = async (id, payload) => {
  const { data } = await apiClient.put(`/patients/${id}`, payload);
  return data;
};

export const patchPatientNotes = async (id, payload) => {
  const { data } = await apiClient.patch(`/patients/${id}/notes`, payload);
  return data;
};

export const getPatientNotes = async (patientId) => {
  const { data } = await apiClient.get(`/patients/${patientId}/notes`);
  return data;
};

export const createPatientNote = async (patientId, payload) => {
  const { data } = await apiClient.post(`/patients/${patientId}/notes`, payload);
  return data;
};

export const updatePatientNote = async (patientId, noteId, payload) => {
  const { data } = await apiClient.put(
    `/patients/${patientId}/notes/${noteId}`,
    payload,
  );
  return data;
};

export const deletePatientNote = async (patientId, noteId) => {
  const { data } = await apiClient.delete(
    `/patients/${patientId}/notes/${noteId}`,
  );
  return data;
};

export const deletePatient = async (id) => {
  const { data } = await apiClient.delete(`/patients/${id}`);
  return data;
};

export const getPatientMedicalHistory = async (patientId) => {
  const { data } = await apiClient.get(`/patients/${patientId}/medical-history`);
  return data;
};

export const savePatientMedicalHistory = async (patientId, payload) => {
  const { data } = await apiClient.put(`/patients/${patientId}/medical-history`, payload);
  return data;
};

export const createPatientMedicalHistory = async (patientId, payload) => {
  const { data } = await apiClient.post(`/patients/${patientId}/medical-history`, payload);
  return data;
};

const patientImportFormData = (file, extra = {}) => {
  const formData = new FormData();
  formData.append("file", file);
  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      formData.append(key, value);
    }
  });
  return formData;
};

export const previewPatientImport = async (file) =>
  (
    await apiClient.post(
      "/patients/import/preview",
      patientImportFormData(file),
      { headers: { "Content-Type": "multipart/form-data" } },
    )
  ).data;

export const importPatients = async (file, rowActions) =>
  (
    await apiClient.post(
      "/patients/import",
      patientImportFormData(file, {
        confirm: "1",
        row_actions: JSON.stringify(rowActions),
      }),
      { headers: { "Content-Type": "multipart/form-data" } },
    )
  ).data;
