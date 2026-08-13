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

export const reorderPrescriptionItems = async (prescriptionId, orderedIds) => {
  const { data } = await apiClient.post(`/prescriptions/${prescriptionId}/items/reorder`, {
    ordered_ids: orderedIds,
  });
  return data;
};

export const deletePrescription = async (prescriptionId) => {
  const { data } = await apiClient.delete(`/prescriptions/${prescriptionId}`);
  return data;
};

export const restorePrescription = async (prescriptionId) => {
  const { data } = await apiClient.post(`/prescriptions/${prescriptionId}/restore`);
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

export const downloadPrescriptionPdf = async (prescriptionId) => {
  const response = await apiClient.get(`/prescriptions/${prescriptionId}/print/pdf`, {
    responseType: "blob",
  });
  const blob = new Blob([response.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `prescription-${prescriptionId}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
