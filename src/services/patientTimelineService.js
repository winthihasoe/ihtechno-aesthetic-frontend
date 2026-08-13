import apiClient from "./apiClient";

export const getPatientTimeline = async (patientId, params = {}) => {
  const { data } = await apiClient.get(`/patients/${patientId}/timeline`, { params });
  return Array.isArray(data) ? data : [];
};
