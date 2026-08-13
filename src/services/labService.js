import apiClient from "./apiClient";

export const getLabTests = async (params = {}) => {
  const { data } = await apiClient.get("/lab-tests", { params });
  return data;
};

export const createLabTest = async (payload) => {
  const { data } = await apiClient.post("/lab-tests", payload);
  return data;
};

export const updateLabTest = async (id, payload) => {
  const { data } = await apiClient.put(`/lab-tests/${id}`, payload);
  return data;
};

export const deleteLabTest = async (id) => {
  await apiClient.delete(`/lab-tests/${id}`);
};

export const getLabRequests = async (params = {}) => {
  const { data } = await apiClient.get("/lab-requests", { params });
  return data;
};

export const getLabRequest = async (id) => {
  const { data } = await apiClient.get(`/lab-requests/${id}`);
  return data;
};

export const getVisitLabRequests = async (visitId) => {
  const { data } = await apiClient.get(`/visits/${visitId}/lab-requests`);
  return data;
};

export const createVisitLabRequest = async (visitId, payload) => {
  const { data } = await apiClient.post(`/visits/${visitId}/lab-requests`, payload);
  return data;
};

export const updateLabRequestResults = async (id, payload) => {
  const { data } = await apiClient.put(`/lab-requests/${id}/results`, payload);
  return data;
};

export const getPatientLabResults = async (patientId) => {
  const { data } = await apiClient.get(`/patients/${patientId}/lab-results`);
  return data;
};
