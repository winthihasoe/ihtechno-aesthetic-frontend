import apiClient from "./apiClient";

export const getVisitPrescriptions = async (visitId) => {
  const { data } = await apiClient.get(`/visits/${visitId}/prescriptions`);
  return data;
};

export const createVisitPrescription = async (visitId, payload) => {
  const { data } = await apiClient.post(`/visits/${visitId}/prescriptions`, payload);
  return data;
};

export const getPatientPrescriptions = async (patientId, params = {}) => {
  const { data } = await apiClient.get(`/patients/${patientId}/prescriptions`, { params });
  return data;
};

export const getPrescription = async (prescriptionId) => {
  const { data } = await apiClient.get(`/prescriptions/${prescriptionId}`);
  return data;
};

export const updatePrescription = async (prescriptionId, payload) => {
  const { data } = await apiClient.put(`/prescriptions/${prescriptionId}`, payload);
  return data;
};

export const deletePrescription = async (prescriptionId) => {
  const { data } = await apiClient.delete(`/prescriptions/${prescriptionId}`);
  return data;
};

export const createStandalonePrescription = async (payload) => {
  const { data } = await apiClient.post("/prescriptions", payload);
  return data;
};

export const getPrescriptionPrintData = async (prescriptionId) => {
  const { data } = await apiClient.get(`/prescriptions/${prescriptionId}/print`);
  return data;
};
