import apiClient from "./apiClient";

export const getPatients = async (params = {}) => {
  const { data } = await apiClient.get("/patients", { params });
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
